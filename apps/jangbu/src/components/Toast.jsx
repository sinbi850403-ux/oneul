import { useEffect, useState } from 'react'

export default function Toast({ message, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onClose() }, 2000)
    return () => clearTimeout(t)
  }, [onClose])

  if (!visible) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-3 rounded-full text-sm shadow-lg z-50 whitespace-nowrap">
      {message}
    </div>
  )
}
