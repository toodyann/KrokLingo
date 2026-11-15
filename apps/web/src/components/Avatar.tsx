import { useState } from 'react'
import type { AccountUser } from '../store/useCloudSync'

/** The account's picture, or its first letter when there is none or it fails to load. */
export function Avatar({ user, size = 40 }: { user: AccountUser; size?: number }) {
  const [broken, setBroken] = useState(false)
  const style = { width: size, height: size }
  if (user.avatarUrl && !broken) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={size}
        height={size}
        style={style}
        className="avatar"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <span className="avatar avatar-initial" style={{ ...style, fontSize: size * 0.42 }} aria-hidden="true">
      {(user.name ?? user.email ?? '?').slice(0, 1).toUpperCase()}
    </span>
  )
}
