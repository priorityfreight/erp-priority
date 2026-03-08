"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getClients, createClient, searchClients, type Client } from "@/lib/db"
import { PageContainer } from "@/components/layout/PageContainer"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])

  const [name, setName] = useState("")
  const [industry, setIndustry] = useState("")
  const [country, setCountry] = useState("")
  const [search, setSearch] = useState("")

  async function fetchClients() {
    try {
      const data = await (search ? searchClients(search) : getClients())
      setClients(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreateClient() {
    if (!name) {
      alert("Client name required")
      return
    }

    try {
      await createClient({
        name,
        industry,
        country,
      })

      setName("")
      setIndustry("")
      setCountry("")

      fetchClients()
    } catch (err) {
      console.error(err)
      alert("Error creating client")
    }
  }

  useEffect(() => {
    fetchClients()
  }, [search])

  return (
    <PageContainer
      title="Clients"
      description="Manage customer companies and account information."
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#111827]">Create Client</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Client Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <button
              type="button"
              onClick={handleCreateClient}
              className="whitespace-nowrap rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
            >
              Create
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#111827]">Client List</h2>
            <input
              className="w-full max-w-xs rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {clients.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No clients yet. Create the first one above.</p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm hover:bg-[#F3F4F6]">
                    <div>
                      <div className="font-medium text-[#111827]">{client.name}</div>
                      <div className="mt-1 text-xs text-[#6B7280]">
                        {client.industry || "No industry"} · {client.country || "No country"}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-[#6B7280]">View</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  )
}
