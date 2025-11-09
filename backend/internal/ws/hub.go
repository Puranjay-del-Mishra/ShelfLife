package ws

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]map[*Client]struct{}),
	}
}

func (h *Hub) Add(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[c.UserID] == nil {
		h.clients[c.UserID] = make(map[*Client]struct{})
	}
	h.clients[c.UserID][c] = struct{}{}
}

func (h *Hub) Remove(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if m, ok := h.clients[c.UserID]; ok {
		delete(m, c)
		if len(m) == 0 {
			delete(h.clients, c.UserID)
		}
	}
	close(c.Send)
}

func (h *Hub) SendToUser(userID string, msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if m, ok := h.clients[userID]; ok {
		for c := range m {
			select {
			case c.Send <- msg:
			default:
				log.Printf("ws: dropping msg for %s (buffer full)", userID)
			}
		}
	}
}
