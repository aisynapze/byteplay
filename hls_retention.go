package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"time"
)

const defaultHLSRetentionTTL = 15 * time.Minute

var ownedHLSID = regexp.MustCompile("^[a-f0-9]{32}$")

func parseHLSCacheLimit(raw string) (int64, error) {
	if raw == "" {
		return maxHLSCacheBytes, nil
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n <= 0 {
		return 0, fmt.Errorf("BITPLAY_CACHE_MAX_BYTES must be a positive integer")
	}
	return n, nil
}

// Includes both storage roots, not just FFmpeg segments. Budget enforcement
// remains conservative: it rejects new work at the watermark and cancels jobs
// when use exceeds the watermark. It does not erase active torrent pieces.
func (m *hlsManager) cacheWithinBudget() bool {
	return m.cacheConfigErr == nil &&
		dirSize(m.torrentRoot)+dirSize(m.root) < m.cacheLimit
}

// A retired playback is removed from admission and cancels its owned FFmpeg
// before its directory is deleted. The manager lock excludes any generation
// switch or in-progress media ServeFile while publishing retirement.
func (m *hlsManager) reapInactive(now time.Time) int {
	m.mu.Lock()
	var retired []*hlsPlayback
	for id, job := range m.jobs {
		job.mu.Lock()
		expired := !job.lastDemand.IsZero() && now.Sub(job.lastDemand) >= m.retentionTTL
		if expired && job.pauseTimer != nil {
			job.pauseTimer.Stop()
		}
		job.mu.Unlock()
		if expired {
			delete(m.jobs, id)
			retired = append(retired, job)
		}
	}
	m.mu.Unlock()
	for _, job := range retired {
		if job.cancel != nil {
			job.cancel()
		}
		if job.done == nil {
			continue
		}
		go func(job *hlsPlayback) {
			<-job.done
			// Never touch arbitrary directories or the persistent torrent root.
			if ownedHLSID.MatchString(job.id) {
				_ = os.RemoveAll(filepath.Join(m.root, job.id))
			}
		}(job)
	}
	return len(retired)
}

func (m *hlsManager) sweepLoop(ctx context.Context) {
	m.reapInactive(time.Now())
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			m.reapInactive(now)
		}
	}
}
