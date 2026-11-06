/**
 * AdminContactMessages Component
 * Admin panel for viewing and managing received contact form messages
 * 
 * Features:
 * - View all received messages with pagination
 * - Mark messages as read/unread
 * - View full message details in modal
 * - Delete messages after confirmation
 * - Filter by read/unread status
 * - Real-time updates for new messages
 * - Timestamp display
 */

import React, { useState, useEffect } from 'react'
import {
  getContactMessages,
  markMessageAsRead,
  deleteMessage,
  subscribeToContactMessages,
} from '../services/contactService'

export default function AdminContactMessages({ notify }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read'
  const [isDeleting, setIsDeleting] = useState(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const MESSAGES_PER_PAGE = 20

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true)
        const filterOption = filter === 'all' ? undefined : filter === 'unread'
        const { messages: data, total: count, error } = await getContactMessages({
          limit: MESSAGES_PER_PAGE,
          offset: page * MESSAGES_PER_PAGE,
          isRead: filterOption ? !filterOption : undefined,
        })

        if (error) {
          notify(`Error loading messages: ${error}`)
          return
        }

        setMessages(data || [])
        setTotal(count || 0)
      } catch (err) {
        notify(`Error: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()

    // Subscribe to new messages
    const unsubscribe = subscribeToContactMessages((update) => {
      if (update.event === 'INSERT') {
        setMessages((prev) => [update.message, ...prev])
        setTotal((prev) => prev + 1)
        notify('New message received!')
      } else if (update.event === 'UPDATE') {
        setMessages((prev) =>
          prev.map((m) => (m.id === update.message.id ? update.message : m))
        )
        if (selectedMessage?.id === update.message.id) {
          setSelectedMessage(update.message)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [filter, page, notify])

  // Toggle message read status
  const handleToggleRead = async (messageId, currentRead) => {
    try {
      const { success, error } = await markMessageAsRead(messageId, !currentRead)
      if (!success) {
        notify(`Error: ${error}`)
      }
    } catch (err) {
      notify(`Error: ${err.message}`)
    }
  }

  // Delete message
  const handleDelete = async () => {
    if (!isDeleting) return

    try {
      const { success, error } = await deleteMessage(isDeleting.id)
      if (!success) {
        notify(`Error: ${error}`)
        return
      }

      setMessages((prev) => prev.filter((m) => m.id !== isDeleting.id))
      setTotal((prev) => Math.max(0, prev - 1))

      if (selectedMessage?.id === isDeleting.id) {
        setSelectedMessage(null)
      }

      setIsDeleting(null)
      notify('Message deleted')
    } catch (err) {
      notify(`Error: ${err.message}`)
    }
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredMessages = messages.filter((m) => {
    if (filter === 'unread') return !m.is_read
    if (filter === 'read') return m.is_read
    return true
  })

  const unreadCount = messages.filter((m) => !m.is_read).length

  return (
    <>
      <div className="admin-card table-card">
        <div className="table-tools">
          <h3>Contact Messages</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value)
                setPage(0)
              }}
              className="form-input"
            >
              <option value="all">All ({total})</option>
              <option value="unread">Unread ({unreadCount})</option>
              <option value="read">Read ({total - unreadCount})</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>No messages found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>From</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map((message) => (
                  <tr key={message.id} className={message.is_read ? '' : 'unread'}>
                    <td>
                      <button
                        onClick={() => handleToggleRead(message.id, message.is_read)}
                        className={`status ${message.is_read ? 'read' : 'unread'}`}
                        title={message.is_read ? 'Mark as unread' : 'Mark as read'}
                      >
                        {message.is_read ? 'Read' : 'Unread'}
                      </button>
                    </td>
                    <td>
                      <strong>{message.visitor_name}</strong>
                    </td>
                    <td>
                      <a href={`mailto:${message.visitor_email}`}>
                        {message.visitor_email}
                      </a>
                    </td>
                    <td>{message.subject}</td>
                    <td style={{ fontSize: '12px', color: '#666' }}>
                      {formatDate(message.created_at)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          onClick={() => setSelectedMessage(message)}
                          title="View"
                          className="btn-icon"
                        >
                          👁
                        </button>
                        <button
                          onClick={() => setIsDeleting(message)}
                          title="Delete"
                          className="btn-icon btn-danger"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > MESSAGES_PER_PAGE && (
          <div className="pagination">
            <span>
              Page {page + 1} of {Math.ceil(total / MESSAGES_PER_PAGE)}
            </span>
            <div>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </button>
              <button
                className="active"
                disabled
              >
                {page + 1}
              </button>
              <button
                onClick={() =>
                  setPage(Math.min(Math.ceil(total / MESSAGES_PER_PAGE) - 1, page + 1))
                }
                disabled={page >= Math.ceil(total / MESSAGES_PER_PAGE) - 1}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="modal-backdrop" onClick={() => setSelectedMessage(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedMessage(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="modal-header">
              <h2>Message from {selectedMessage.visitor_name}</h2>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {formatDate(selectedMessage.created_at)}
              </div>
            </div>

            <div className="modal-content">
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                <div style={{ marginBottom: '12px' }}>
                  <strong>From:</strong>{' '}
                  <a href={`mailto:${selectedMessage.visitor_email}`}>
                    {selectedMessage.visitor_email}
                  </a>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Subject:</strong> {selectedMessage.subject}
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '3px',
                      backgroundColor: selectedMessage.is_read ? '#e8f5e9' : '#fff3e0',
                      fontSize: '12px',
                    }}
                  >
                    {selectedMessage.is_read ? 'Read' : 'Unread'}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginTop: 0 }}>Message:</h4>
                <div
                  style={{
                    padding: '15px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                  }}
                >
                  {selectedMessage.message}
                </div>
              </div>

              {selectedMessage.ip_address && (
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '10px' }}>
                  IP: {selectedMessage.ip_address}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => handleToggleRead(selectedMessage.id, selectedMessage.is_read)}
                className="btn btn-secondary"
              >
                {selectedMessage.is_read ? 'Mark as Unread' : 'Mark as Read'}
              </button>
              <button
                onClick={() => setIsDeleting(selectedMessage)}
                className="btn btn-danger"
              >
                Delete Message
              </button>
              <button
                onClick={() => setSelectedMessage(null)}
                className="btn btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="modal-backdrop" onClick={() => setIsDeleting(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Message?</h3>
            <p>
              Are you sure you want to delete the message from{' '}
              <strong>{isDeleting.visitor_name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsDeleting(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

