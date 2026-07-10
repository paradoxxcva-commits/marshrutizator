import React from 'react'
import { useState } from 'react'
import { adminApi } from '../api/client'
import DevNotificationsPanel from '../components/Admin/DevNotificationsPanel'
import DefaultUserSettingsTab from '../components/Admin/DefaultUserSettingsTab'
import { useTranslation } from '../i18n'
import PageShell from '../components/Layout/PageShell'
import CategoryManager from '../components/Admin/CategoryManager'
import BackupPanel from '../components/Admin/BackupPanel'
import GitHubPanel from '../components/Admin/GitHubPanel'
import AddonManager from '../components/Admin/AddonManager'
import PackingTemplateManager from '../components/Admin/PackingTemplateManager'
import AuditLogPanel from '../components/Admin/AuditLogPanel'
import AdminMcpTokensPanel from '../components/Admin/AdminMcpTokensPanel'
import { Users, Map, Briefcase, Shield, FileText, SlidersHorizontal, UserCog, Puzzle, Settings as SettingsIcon, Bell, Database, ScrollText, KeyRound, GitBranch, Bug } from 'lucide-react'
import PageSidebar, { type PageSidebarTab } from '../components/Layout/PageSidebar'
import { useAdmin } from './admin/useAdmin'
import AdminUpdateBanner from './admin/AdminUpdateBanner'
import AdminStatCard from './admin/AdminStatCard'
import AdminUsersTab from './admin/AdminUsersTab'
import AdminSettingsTab from './admin/AdminSettingsTab'
import AdminNotificationsTab from './admin/AdminNotificationsTab'
import AdminUserModals from './admin/AdminUserModals'

export default function AdminPage(): React.ReactElement {
  const { t, locale } = useTranslation()
  // Page = wiring container: all admin data slices + handlers live in the hook,
  // each tab/section renders from a dedicated sub-component.
  const admin = useAdmin()
  const {
    demoMode, mcpEnabled, devMode, toast,
    activeTab, setActiveTab, stats,
    bagTrackingEnabled, setBagTrackingEnabled,
    collabFeatures, setCollabFeatures,
    serverTimezone,
    updateInfo, setShowUpdateModal,
  } = admin

  const TABS: PageSidebarTab[] = [
    { id: 'users', label: t('admin.tabs.users'), icon: Users },
    { id: 'config', label: t('admin.tabs.config'), icon: SlidersHorizontal },
    { id: 'defaults', label: t('admin.tabs.defaults'), icon: UserCog },
    { id: 'addons', label: t('admin.tabs.addons'), icon: Puzzle },
    { id: 'settings', label: t('admin.tabs.settings'), icon: SettingsIcon },
    { id: 'notifications', label: t('admin.tabs.notifications'), icon: Bell },
    { id: 'backup', label: t('admin.tabs.backup'), icon: Database },
    { id: 'audit', label: t('admin.tabs.audit'), icon: ScrollText },
    ...(mcpEnabled ? [{ id: 'mcp-tokens', label: t('admin.tabs.mcpTokens'), icon: KeyRound }] : []),
    { id: 'github', label: t('admin.tabs.github'), icon: GitBranch },
    { id: 'test-api', label: 'Тест API', icon: Bug },
    ...(devMode ? [{ id: 'dev-notifications', label: 'Dev: Notifications', icon: Bug }] : []),
  ]

  return (
    <PageShell background="var(--bg-secondary)">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('admin.title')}</h1>
              <p className="text-slate-500 text-sm">{t('admin.subtitle')}</p>
            </div>
          </div>

          {/* Update Banner */}
          {updateInfo && (
            <AdminUpdateBanner updateInfo={updateInfo} t={t} onHowTo={() => setShowUpdateModal(true)} />
          )}

          {/* Demo Baseline Button */}
          {demoMode && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">Demo Baseline</p>
                <p className="text-xs text-amber-700">Save current state as the hourly reset point. All admin trips and settings will be preserved.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await adminApi.saveDemoBaseline()
                    toast.success('Baseline saved! Resets will restore to this state.')
                  } catch (e) {
                    toast.error(e.response?.data?.error || 'Failed to save baseline')
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors flex-shrink-0 ml-4"
              >
                Save Baseline
              </button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: t('admin.stats.users'), value: stats.totalUsers, icon: Users },
                { label: t('admin.stats.trips'), value: stats.totalTrips, icon: Briefcase },
                { label: t('admin.stats.places'), value: stats.totalPlaces, icon: Map },
                { label: t('admin.stats.files'), value: stats.totalFiles || 0, icon: FileText },
              ].map(({ label, value, icon: Icon }) => (
                <AdminStatCard key={label} label={label} value={value} icon={Icon} />
              ))}
            </div>
          )}

          {/* Sidebar layout — nav on the left, active panel on the right */}
          <PageSidebar
            sidebarLabel={t('admin.title').toUpperCase()}
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            footer="admin · self-hosted"
          >
            {/* Tab content */}
          {activeTab === 'users' && (
            <AdminUsersTab admin={admin} t={t} locale={locale} />
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <PackingTemplateManager />
              <CategoryManager />
            </div>
          )}

          {activeTab === 'addons' && (
            <div className="space-y-6">
              <AddonManager bagTrackingEnabled={bagTrackingEnabled} onToggleBagTracking={async () => {
                const next = !bagTrackingEnabled
                setBagTrackingEnabled(next)
                try { await adminApi.updateBagTracking(next) } catch { setBagTrackingEnabled(!next) }
              }} collabFeatures={collabFeatures} onToggleCollabFeature={async (key: string) => {
                const next = { ...collabFeatures, [key]: !collabFeatures[key] }
                setCollabFeatures(next)
                try { await adminApi.updateCollabFeatures({ [key]: next[key] }) } catch { setCollabFeatures(collabFeatures) }
              }} />
            </div>
          )}

          {activeTab === 'settings' && (
            <AdminSettingsTab admin={admin} t={t} />
          )}

          {activeTab === 'notifications' && (
            <AdminNotificationsTab admin={admin} t={t} />
          )}

          {activeTab === 'backup' && <BackupPanel />}

          {activeTab === 'audit' && <AuditLogPanel serverTimezone={serverTimezone} />}

          {activeTab === 'mcp-tokens' && <AdminMcpTokensPanel />}

          {activeTab === 'github' && <GitHubPanel isPrerelease={updateInfo?.is_prerelease ?? false} />}

          {activeTab === 'defaults' && <DefaultUserSettingsTab />}

          {activeTab === 'dev-notifications' && <DevNotificationsPanel />}

          {activeTab === 'test-api' && <TestDescribePlacePanel />}
          </PageSidebar>
        </div>

      <AdminUserModals admin={admin} t={t} />
    </PageShell>
  )
}

function TestDescribePlacePanel() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const testEndpoint = async () => {
    setLoading(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/maps/describe-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: 57.249866, lng: 60.074758 }),
      })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (e: any) {
      setError(e.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Тест описания мест</h3>
      <p className="text-sm text-slate-500">
        Проверка интеграции с внешним сервисом описания мест (webhook).
      </p>
      <button
        onClick={testEndpoint}
        disabled={loading}
        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Запрос...' : 'Проверить описание места'}
      </button>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {result && (
        <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 overflow-auto max-h-96">
          {result}
        </pre>
      )}
    </div>
  )
}
