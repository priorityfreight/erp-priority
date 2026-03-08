"use client"

import { useEffect, useState } from "react"
import {
  getContacts,
  getClients,
  createContact,
  type ContactWithClient,
  type Client,
} from "@/lib/db"
import { PageContainer } from "@/components/layout/PageContainer"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [clientId, setClientId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [position, setPosition] = useState("")

  async function fetchContacts() {
    try {
      const data = await getContacts()
      setContacts(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchClients() {
    try {
      const data = await getClients()
      setClients(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreateContact() {
    if (!clientId) {
      alert("Select client")
      return
    }

    if (!name) {
      alert("Name required")
      return
    }

    try {
      await createContact({
        client_id: clientId,
        name,
        email,
        phone,
        position,
      })

      setClientId("")
      setName("")
      setEmail("")
      setPhone("")
      setPosition("")

      fetchContacts()
    } catch (err) {
      console.error(err)
      alert("Error creating contact")
    }
  }

  useEffect(() => {
    fetchContacts()
    fetchClients()
  }, [])

  return (
    <PageContainer
      title="Contacts"
      description="Manage client contacts and key people for communication."
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#111827]">Create Contact</h2>
          <div className="grid gap-3 md:grid-cols-5">
            <select
              className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <div className="flex gap-3">
              <input
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
              <button
                type="button"
                onClick={handleCreateContact}
                className="whitespace-nowrap rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
              >
                Create
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#111827]">Contact List</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              No contacts yet. Create a contact linked to a client above.
            </p>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-[#111827]">{contact.name}</div>
                    <div className="mt-1 text-xs text-[#6B7280]">
                      {contact.email || "No email"} · {contact.phone || "No phone"}
                    </div>
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    Client: {contact.clients?.name || "Unlinked"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  )
}
