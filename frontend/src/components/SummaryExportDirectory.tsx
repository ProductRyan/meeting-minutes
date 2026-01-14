"use client"

import { useEffect, useState } from "react"
import { FolderOpen } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"

export function SummaryExportDirectory() {
  const [exportDirectory, setExportDirectory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState("")

  // Load export directory on mount
  useEffect(() => {
    loadExportDirectory()
  }, [])

  const loadExportDirectory = async () => {
    setIsLoading(true)
    try {
      const directory = await invoke<string | null>('api_get_summary_export_directory')
      setExportDirectory(directory)
      setInputValue(directory || "")
    } catch (error) {
      console.error('Failed to load export directory:', error)
      toast.error("Failed to load export directory")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDirectory = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a valid directory path")
      return
    }

    try {
      await invoke('api_set_summary_export_directory', {
        directory: inputValue.trim()
      })
      setExportDirectory(inputValue.trim())
      setIsEditing(false)
      toast.success("Export directory saved", {
        description: `Summaries will be saved to: ${inputValue.trim()}`
      })
    } catch (error) {
      console.error('Failed to save export directory:', error)
      toast.error("Failed to save export directory")
    }
  }

  const handleOpenFolder = async () => {
    if (!exportDirectory) {
      toast.error("No export directory set")
      return
    }

    try {
      await invoke('open_external_url', { url: exportDirectory })
    } catch (error) {
      console.error('Failed to open export directory:', error)
      toast.error("Failed to open export directory")
    }
  }

  if (isLoading) {
    return <div className="p-4 border rounded-lg bg-gray-50">Loading...</div>
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="font-medium mb-2">Summary Export Directory</div>
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="/path/to/export/directory"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveDirectory}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setInputValue(exportDirectory || "")
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : exportDirectory ? (
        <>
          <div className="text-sm text-gray-600 mb-3 break-all font-mono text-xs">
            {exportDirectory}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Open Folder
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              Change Directory
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm text-gray-600 mb-3">
            No export directory configured
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Set Directory
          </button>
        </>
      )}
    </div>
  )
}
