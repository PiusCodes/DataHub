import React, { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useToast } from '../components/Toast'
import { isConvexConfigured } from '../convexClient'

const flowSteps = [
  'Submit request with specifications',
  'Publish demand to creators',
  'Collect seller responses',
  'Negotiate fulfillment',
]

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [form, setForm] = useState({ title: '', desc: '', budget: '' })
  const { addToast } = useToast()
  const requestRows = useQuery(api.myFunctions.listRequests, isConvexConfigured ? {} : 'skip')
  const createRequest = useMutation(api.myFunctions.createRequest)

  useEffect(() => {
    if (requestRows) setRequests(requestRows)
  }, [requestRows])

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!isConvexConfigured) {
      addToast('Request publishing is not available yet.', 'error')
      return
    }

    createRequest({
      title: form.title,
      desc: form.desc,
      budget: Number(form.budget || 0),
    })
      .then((nextRequest) => {
        setRequests((current) => [nextRequest, ...current])
        addToast('Request published for dataset creators.', 'success')
        setForm({ title: '', desc: '', budget: '' })
      })
      .catch((error) => addToast(error.message || 'Could not create request.', 'error'))
  }

  return (
    <div className="page-stack">
      <section className="section section-form-layout">
        <div className="section-heading">
          <p className="eyebrow">Custom dataset request</p>
          <h2>Open a clear demand signal for dataset creators.</h2>
          <p className="section-copy">
            Requests are public marketplace opportunities. Sellers can use them to decide what to publish next.
          </p>
        </div>

        <div className="flow-strip flow-strip-wide">
          {flowSteps.map((step, index) => (
            <div key={step} className="flow-step">
              <span className="flow-step-number">0{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        <div className="form-layout">
          <form className="glass-form" onSubmit={handleSubmit}>
            <div className="status-banner">
              <span className="role-pill">Requester</span>
              <span>Authenticated users can open demand and negotiate fulfillment</span>
            </div>

            <label className="field-label" htmlFor="request-title">
              Title
            </label>
            <input
              id="request-title"
              className="input"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />

            <label className="field-label" htmlFor="request-desc">
              Specifications
            </label>
            <textarea
              id="request-desc"
              className="input textarea"
              name="desc"
              value={form.desc}
              onChange={handleChange}
              rows={5}
            />

            <label className="field-label" htmlFor="request-budget">
              Budget (USD)
            </label>
            <input
              id="request-budget"
              className="input"
              name="budget"
              value={form.budget}
              onChange={handleChange}
              type="number"
              min="0"
            />

            <button className="button button-primary" type="submit">
              Submit request
            </button>
          </form>

          <div className="request-list">
            {requests.length ? (
              requests.map((request) => (
                <article key={request._id} className="request-card">
                  <div className="request-card-top">
                    <h3>{request.title}</h3>
                    <span className="role-pill">{request.stage}</span>
                  </div>
                  <p>{request.desc || 'No specifications added.'}</p>
                  <div className="request-meta">
                    <span>{request.budget ? `Budget: $${request.budget}` : 'Budget not set'}</span>
                    <span>Awaiting seller response</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>No requests yet</h3>
                <p>Requests will appear here after users submit real dataset requirements.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
