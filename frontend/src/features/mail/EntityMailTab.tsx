"use client"

import { useEffect, useState } from "react"
import { getInboxThreads, getMailThread, replyToMailThread } from "@/lib/mail/api"
import type { MailEntityType, MailThreadDetail, MailThreadSummary } from "@/lib/mail/types"
import { notifyError, notifySuccess } from "@/lib/feedback"
import { MailWorkbench } from "./MailWorkbench"

type EntityMailTabProps = {
  entityType: MailEntityType
  entityId: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
}

export function EntityMailTab({
  entityType,
  entityId,
  title,
  description,
  emptyTitle,
  emptyDescription,
}: EntityMailTabProps) {
  const [threads, setThreads] = useState<MailThreadSummary[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadDetail, setThreadDetail] = useState<MailThreadDetail | null>(null)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadThreads() {
      try {
        setLoadingThreads(true)
        const response = await getInboxThreads({
          entityType,
          entityId,
        })

        if (cancelled) {
          return
        }

        setThreads(response.items)
        setSelectedThreadId((current) => current ?? response.items[0]?.id ?? null)
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          notifyError("No se pudieron cargar los correos vinculados.")
        }
      } finally {
        if (!cancelled) {
          setLoadingThreads(false)
        }
      }
    }

    void loadThreads()

    return () => {
      cancelled = true
    }
  }, [entityId, entityType])

  useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null)
      return
    }

    const threadId = selectedThreadId
    let cancelled = false

    async function loadThread() {
      try {
        setLoadingThread(true)
        const response = await getMailThread(threadId)
        if (!cancelled) {
          setThreadDetail(response)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          notifyError("No se pudo abrir el thread.")
        }
      } finally {
        if (!cancelled) {
          setLoadingThread(false)
        }
      }
    }

    void loadThread()

    return () => {
      cancelled = true
    }
  }, [selectedThreadId])

  async function handleReply(payload: { body: string; to: string[]; cc?: string[] }) {
    if (!selectedThreadId) {
      return
    }

    const threadId = selectedThreadId

    try {
      setReplying(true)
      await replyToMailThread(threadId, payload)
      const [threadsResponse, detailResponse] = await Promise.all([
        getInboxThreads({
          entityType,
          entityId,
        }),
        getMailThread(threadId),
      ])
      setThreads(threadsResponse.items)
      setThreadDetail(detailResponse)
      notifySuccess("Respuesta enviada.")
    } catch (error) {
      console.error(error)
      notifyError("No se pudo enviar la respuesta.")
    } finally {
      setReplying(false)
    }
  }

  return (
    <MailWorkbench
      title={title}
      description={description}
      threads={threads}
      selectedThreadId={selectedThreadId}
      onSelectThread={setSelectedThreadId}
      threadDetail={threadDetail}
      loadingThreads={loadingThreads}
      loadingThread={loadingThread}
      replying={replying}
      onReply={handleReply}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  )
}
