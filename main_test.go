package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEmptyMagnetReturnsOneJSONError(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/api/v1/torrent/add", strings.NewReader(`{"magnet":""}`))
	w := httptest.NewRecorder()
	addTorrentHandler(w, r)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want 400", w.Code)
	}
	var got map[string]interface{}
	dec := json.NewDecoder(bytes.NewReader(w.Body.Bytes()))
	if err := dec.Decode(&got); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if err := dec.Decode(&got); err == nil {
		t.Fatal("more than one JSON document returned")
	}
}

func TestRawInfohashNormalization(t *testing.T) {
	input := strings.Repeat("a", 40)
	got, err := normalizeMagnetInput(input)
	if err != nil || got != "magnet:?xt=urn:btih:"+input {
		t.Fatalf("normalized=%q, err=%v", got, err)
	}
	for _, invalid := range []string{"", strings.Repeat("a", 64), "https://example.com", "magnet:"} {
		if _, err := normalizeMagnetInput(invalid); err == nil {
			t.Errorf("%q unexpectedly accepted", invalid)
		}
	}
}

func TestListenPolicy(t *testing.T) {
	tests := []struct {
		host, user, pass string
		allow, ok bool
	}{
		{"127.0.0.1", "", "", false, true},
		{"::1", "", "", false, true},
		{"0.0.0.0", "", "", false, false},
		{"0.0.0.0", "user", "pass", false, true},
		{"0.0.0.0", "", "", true, true},
		{"127.0.0.1", "user", "", false, false},
	}
	for _, tt := range tests {
		err := validateListenHost(tt.host, tt.user, tt.pass, tt.allow)
		if (err == nil) != tt.ok {
			t.Errorf("%q %q: got %v, want allow=%v", tt.host, tt.user, err, tt.ok)
		}
	}
}

func TestRedactedSettings(t *testing.T) {
	settingsMutex.Lock()
	previous := currentSettings
	currentSettings = Settings{
		EnableProxy: true, ProxyURL: "socks5://alice:mySecret@localhost:1080",
		ProwlarrApiKey: "indexerSecret", JackettApiKey: "jackettSecret",
	}
	settingsMutex.Unlock()
	t.Cleanup(func() {
		settingsMutex.Lock()
		currentSettings = previous
		settingsMutex.Unlock()
	})
	w := httptest.NewRecorder()
	settingsHandler(w, httptest.NewRequest(http.MethodGet, "/api/v1/settings", nil))
	got := w.Body.String()
	for _, secret := range []string{"mySecret", "indexerSecret", "jackettSecret", "alice"} {
		if strings.Contains(got, secret) {
			t.Errorf("settings leaked %q: %s", secret, got)
		}
	}
	if !strings.Contains(got, `"proxyCredentialsSet":true`) {
		t.Errorf("missing credential-presence field: %s", got)
	}
}

func TestIndexerOriginPolicy(t *testing.T) {
	s := Settings{EnableProwlarr: true, ProwlarrHost: "http://127.0.0.1:9696"}
	for _, tc := range []struct{ raw string; allowed bool }{
		{"http://127.0.0.1:9696/api/v1/download?id=3", true},
		{"http://127.0.0.1:9697/api/v1/download", false},
		{"https://127.0.0.1:9696/api/v1/download", false},
		{"http://user:pass@127.0.0.1:9696/api", false},
		{"file:///etc/passwd", false},
		{"http://127.0.0.1.evil.test:9696/api", false},
	} {
		if got := allowedIndexerURL(tc.raw, s); got != tc.allowed {
			t.Errorf("%q: got %v want %v", tc.raw, got, tc.allowed)
		}
	}
}

func TestTorrentUploadRejectsOversizedRequest(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/api/v1/torrent/convert", strings.NewReader(strings.Repeat("x", (10<<20)+500)))
	r.Header.Set("Content-Type", "multipart/form-data; boundary=example")
	w := httptest.NewRecorder()
	convertTorrentToMagnetHandler(w, r)
	if w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("got status %d, want 413; body=%s", w.Code, w.Body.String())
	}
}
