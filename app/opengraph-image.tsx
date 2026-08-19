// CANONICAL social card, generated at request time (QA-015 — no binary asset in the repo).
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'HomeschoolCompliance Pack — never miss a homeschool filing deadline'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #022c22 0%, #064e3b 55%, #065f46 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, color: '#6ee7b7', fontWeight: 700 }}>
          HomeschoolCompliance Pack
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 72, fontWeight: 800, lineHeight: 1.1, maxWidth: 980 }}>
          Never miss a homeschool filing deadline again.
        </div>
        <div style={{ display: 'flex', marginTop: 32, fontSize: 32, color: '#d1fae5', maxWidth: 940 }}>
          Your state’s requirements turned into documents, dates, and reminders. Pay once, keep it.
        </div>
      </div>
    ),
    size
  )
}
