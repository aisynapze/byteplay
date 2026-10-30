package main

import (
	"bytes"
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/anacrolix/torrent/metainfo"
)

func TestTorrentStorageGuardsFarOffsetBeforeSparseFileExpansion(t *testing.T) {
	root := t.TempDir()
	m := newHLSManager(filepath.Join(root, "hls-cache"), "unused")
	m.torrentRoot = filepath.Join(root, "torrent-data")
	info := &metainfo.Info{PieceLength: 64, Name: "video.mp4", Length: 384, Pieces: make([]byte, 6*20)}
	storage := newBudgetTorrentStorage(m.torrentRoot, m)
	defer storage.Close()
	torrent, err := storage.OpenTorrent(context.Background(), info, metainfo.Hash{})
	if err != nil {
		t.Fatal(err)
	}
	defer torrent.Close()
	// The real file backend creates a persistent piece-completion database.
	// Allocate 128 bytes above that baseline rather than counting its bytes
	// as a failed video-piece reservation.
	m.cacheLimit = dirSize(m.torrentRoot) + 128
	first := torrent.Piece(info.Piece(0))
	if n, err := first.WriteAt(bytes.Repeat([]byte("a"), 32), 0); err != nil || n != 32 {
		t.Fatalf("first write: %d %v", n, err)
	}
	far := torrent.Piece(info.Piece(5))
	if n, err := far.WriteAt(bytes.Repeat([]byte("z"), 32), 0); !errors.Is(err, errTorrentCacheFull) || n != 0 {
		t.Fatalf("sparse 320-byte growth accepted: n=%d err=%v", n, err)
	}
	data, err := os.Stat(filepath.Join(m.torrentRoot, "video.mp4.part"))
	if err != nil || data.Size() != 32 {
		t.Fatalf("rejected sparse write changed disk usage: %v %v", data, err)
	}
	if n, err := first.WriteAt(bytes.Repeat([]byte("b"), 32), 32); err != nil || n != 32 {
		t.Fatalf("adjacent piece bytes rejected: n=%d err=%v", n, err)
	}
}

func TestTorrentWritesShareHeadroomWithHLSReservation(t *testing.T) {
	root := t.TempDir()
	m := newHLSManager(filepath.Join(root, "hls-cache"), "unused")
	m.torrentRoot = filepath.Join(root, "torrent-data")
	m.reserveBytes = 144
	info := &metainfo.Info{PieceLength: 64, Name: "clip.mp4", Length: 256, Pieces: make([]byte, 4*20)}
	storage := newBudgetTorrentStorage(m.torrentRoot, m)
	defer storage.Close()
	torrent, err := storage.OpenTorrent(context.Background(), info, metainfo.Hash{})
	if err != nil {
		t.Fatal(err)
	}
	defer torrent.Close()
	m.cacheLimit = dirSize(m.torrentRoot) + 200
	if !m.reserveCache(filepath.Join(m.root, "reserved")) {
		t.Fatal("HLS reservation not admitted")
	}
	piece := torrent.Piece(info.Piece(0))
	if n, err := piece.WriteAt(make([]byte, 48), 0); err != nil || n != 48 {
		t.Fatalf("48 bytes should fit with HLS reservation: %d %v", n, err)
	}
	if n, err := piece.WriteAt(make([]byte, 16), 48); !errors.Is(err, errTorrentCacheFull) || n != 0 {
		t.Fatalf("wrote beyond remaining HLS headroom: %d %v", n, err)
	}
	m.releaseCache(filepath.Join(m.root, "reserved"))
	if n, err := piece.WriteAt(make([]byte, 16), 48); err != nil || n != 16 {
		t.Fatalf("released HLS capacity not available: %d %v", n, err)
	}
}

func TestTorrentWriteRejectsMetadataPathTraversal(t *testing.T) {
	info := &metainfo.Info{PieceLength: 64, Name: "../outside", Length: 64, Pieces: make([]byte, 20)}
	_, err := torrentProjectedFileEnds(t.TempDir(), info.Piece(0), 0, 16)
	if err == nil || !strings.Contains(err.Error(), "escapes") {
		t.Fatalf("unsafe torrent file path not rejected: %v", err)
	}
}

func TestTorrentPieceProjectionAcrossMultipleFiles(t *testing.T) {
	info := &metainfo.Info{PieceLength: 128, Name: "album", Files: []metainfo.FileInfo{
		{Path: []string{"a.mkv"}, Length: 70},
		{Path: []string{"b.mkv"}, Length: 90},
	}, Pieces: make([]byte, 40)}
	ends, err := torrentProjectedFileEnds(t.TempDir(), info.Piece(0), 60, 40)
	if err != nil {
		t.Fatal(err)
	}
	if len(ends) != 2 {
		t.Fatalf("piece should span two files: %v", ends)
	}
	for name, size := range ends {
		if strings.HasSuffix(name, "a.mkv.part") && size != 70 {
			t.Fatalf("first file should end at 70, got %d", size)
		}
		if strings.HasSuffix(name, "b.mkv.part") && size != 30 {
			t.Fatalf("second file should end at 30, got %d", size)
		}
	}
}
