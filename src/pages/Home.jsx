import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useConvexUser } from '../utils/convexAuth'

const baseUseCases = [
  {
    title: 'Dataset publishing',
    actor: 'Uploader',
    precondition: 'Logged in',
    flow: 'Add metadata, license, file name, and optional price',
    outcome: 'Dataset listed as free or checkout-required',
    link: '/upload',
  },
  {
    title: 'Dataset discovery',
    actor: 'Downloader or Requester',
    precondition: 'Public browsing',
    flow: 'Search listings, compare quality signals, review license and pricing',
    outcome: 'Free datasets open quickly; paid listings start checkout',
    link: '/explore',
  },
  {
    title: 'Custom Dataset Request',
    actor: 'Downloader or Requester',
    precondition: 'Logged in',
    flow: 'Submit request, publish demand, collect seller responses',
    outcome: 'Custom dataset delivered',
    link: '/requests',
  },
  {
    title: 'Platform Administration',
    actor: 'Admin',
    precondition: 'Admin privileges',
    flow: 'Review flagged content, moderate datasets, generate reports, update settings',
    outcome: 'Platform integrity maintained',
    link: '/admin',
  },
]

export default function Home() {
  const { isAuthenticated: signedIn, developerAllowed, profileLoading } = useConvexUser()
  const useCases = useMemo(
    () =>
      baseUseCases.map((item) => {
        if (item.link === '/admin') {
          return {
            ...item,
            link: signedIn && developerAllowed && !profileLoading ? '/admin' : '/signin',
          }
        }

        if (item.link === '/upload' || item.link === '/requests') {
          return {
            ...item,
            link: signedIn ? item.link : '/signin',
          }
        }

        return item
      }),
    [developerAllowed, profileLoading, signedIn]
  )

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Kaggle-inspired data marketplace</p>
          <h2 className="hero-title">Find, publish, and request datasets without hiding the important details.</h2>
          <p className="hero-text">
            DataHub keeps discovery open and professional: clear licenses, quality signals,
            publisher-owned pricing, and secure access grants behind a simple Convex backend.
          </p>

          <div className="hero-actions">
            <Link className="hero-button hero-button-secondary" to="/explore">
              Explore datasets
            </Link>
            <Link className="hero-button hero-button-primary" to={signedIn ? '/upload' : '/signin'}>
              Publish dataset
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-header">
            <span>Marketplace model</span>
            <span className="live-pill">Open source</span>
          </div>

          <div className="hero-stats">
            <article className="stat-card">
              <p>Default access</p>
              <strong>Free</strong>
              <span>Uploaders can set a price when a dataset should require checkout.</span>
            </article>
            
            <article className="stat-card">
              <p>Quality signals</p>
              <strong>Transparent</strong>
              <span>Dataset listings show license, file size, and Convex-powered quality signals.</span>
            </article>

            <article className="stat-card">
              <p>Secure access</p>
              <strong>Private</strong>
              <span>Uploaders can grant access to specific users or groups.</span>
            </article>
          </div>
        </div>
      </section>
      <section className="use-cases">
        <h3>Common workflows</h3>
        <div className="use-case-list">
          {useCases.map((item) => (
            <article className="use-case-card" key={item.title}>
              <h4>{item.title}</h4>
              <p>
                <strong>Actor:</strong> {item.actor}
              </p>
             
              <Link className="text-link" to={item.link}>
                Open workflow
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
