import { useState, useEffect } from 'react'
import { Bell, Webhook, Plus, Trash2, Mail, LogOut, Send, Layers, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import { PrivacyPolicy } from './PrivacyPolicy'
import { TermsOfService } from './TermsOfService'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || (typeof window !== 'undefined' && window.location.port === '5173' 
  ? 'http://localhost:8000' 
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'))

interface Rule {
  id: number;
  rule_type: 'sender' | 'subject' | 'body' | 'attachment';
  value: string;
  rule_group_id: number;
}

interface RuleGroup {
  id: number;
  name: string;
  webhook_id: number;
  notify_ping: boolean;
  rules: Rule[];
}

interface WebhookItem {
  id: number;
  name: string;
  url: string;
  user_id: number;
  rule_groups: RuleGroup[];
}

interface User {
  id: number;
  email: string;
  discord_user_id: string | null;
  webhooks: WebhookItem[];
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'privacy' | 'terms'>('dashboard')

  // Discord User ID State
  const [discordId, setDiscordId] = useState('')
  const [isSavingDiscordId, setIsSavingDiscordId] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // New Webhook Form State
  const [showAddWebhook, setShowAddWebhook] = useState(false)
  const [newWebhookName, setNewWebhookName] = useState('')
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false)

  // Active Rule Form inputs keyed by group ID
  const [groupRuleInputs, setGroupRuleInputs] = useState<
    Record<number, { type: 'sender' | 'subject' | 'body' | 'attachment'; value: string; customExt?: string }>
  >({})

  // Feedback states
  const [testStatus, setTestStatus] = useState<Record<number, string>>({})

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#privacy') setCurrentView('privacy')
      else if (window.location.hash === '#terms') setCurrentView('terms')
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)

    const params = new URLSearchParams(window.location.search)
    const userIdParam = params.get('user_id')
    
    if (userIdParam) {
      localStorage.setItem('user_id', userIdParam)
      window.history.replaceState({}, document.title, '/')
    }

    const storedUserId = localStorage.getItem('user_id')
    if (storedUserId) {
      fetchUserData(parseInt(storedUserId))
    } else {
      setLoading(false)
    }

    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const fetchUserData = async (userId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}`)
      setUser(response.data)
      setDiscordId(response.data.discord_user_id || '')
    } catch (error) {
      console.error("Error fetching user data:", error)
      localStorage.removeItem('user_id')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDiscordId = async () => {
    if (!user) return
    setIsSavingDiscordId(true)
    try {
      await axios.patch(`${API_BASE_URL}/users/${user.id}`, {
        discord_user_id: discordId.trim() || null
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
      fetchUserData(user.id)
    } catch (error) {
      console.error("Error saving Discord ID:", error)
      alert("Erreur lors de l'enregistrement de l'ID Discord.")
    } finally {
      setIsSavingDiscordId(false)
    }
  }

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/login`
  }

  const handleLogout = () => {
    localStorage.removeItem('user_id')
    setUser(null)
  }

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!newWebhookUrl.trim()) {
      alert('Veuillez entrer une URL de Webhook Discord valide.')
      return
    }

    setIsCreatingWebhook(true)
    try {
      await axios.post(`${API_BASE_URL}/users/${user.id}/webhooks`, {
        name: newWebhookName.trim() || 'Webhook Discord',
        url: newWebhookUrl.trim()
      })
      setNewWebhookName('')
      setNewWebhookUrl('')
      setShowAddWebhook(false)
      fetchUserData(user.id)
    } catch (error) {
      console.error("Error creating webhook:", error)
      alert("Erreur lors de la création du webhook.")
    } finally {
      setIsCreatingWebhook(false)
    }
  }

  const handleDeleteWebhook = async (webhookId: number) => {
    if (!user) return
    if (!confirm('Voulez-vous vraiment supprimer ce Webhook et toutes ses règles ?')) return
    try {
      await axios.delete(`${API_BASE_URL}/webhooks/${webhookId}`)
      fetchUserData(user.id)
    } catch (error) {
      console.error("Error deleting webhook:", error)
    }
  }

  const handleAddRuleGroup = async (webhookId: number) => {
    if (!user) return
    try {
      const groupCount = (user.webhooks.find(w => w.id === webhookId)?.rule_groups.length || 0) + 1
      await axios.post(`${API_BASE_URL}/webhooks/${webhookId}/groups`, {
        name: `Groupe ${groupCount} (Conditions ET)`
      })
      fetchUserData(user.id)
    } catch (error) {
      console.error("Error adding rule group:", error)
    }
  }

  const handleDeleteRuleGroup = async (groupId: number) => {
    if (!user) return
    if (!confirm('Supprimer ce groupe de règles ?')) return
    try {
      await axios.delete(`${API_BASE_URL}/groups/${groupId}`)
      fetchUserData(user.id)
    } catch (error) {
      console.error("Error deleting rule group:", error)
    }
  }

  const handleTogglePing = async (groupId: number, currentPing: boolean) => {
    if (!user) return
    try {
      await axios.patch(`${API_BASE_URL}/groups/${groupId}`, {
        notify_ping: !currentPing
      })
      fetchUserData(user.id)
    } catch (error) {
      console.error("Error updating ping setting:", error)
    }
  }

  const handleAddRule = async (groupId: number, e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const input = groupRuleInputs[groupId] || { type: 'sender', value: '' }
    
    let finalValue = input.value.trim()
    if (input.type === 'attachment') {
      if (!finalValue) finalValue = 'any'
      if (finalValue === 'custom') {
        finalValue = (input.customExt || '').trim().replace(/^\./, '')
        if (!finalValue) {
          alert('Veuillez saisir une extension de fichier.')
          return
        }
      }
    } else {
      if (!finalValue) {
        alert('Veuillez saisir une valeur.')
        return
      }
    }

    try {
      await axios.post(`${API_BASE_URL}/groups/${groupId}/rules`, {
        rule_type: input.type,
        value: finalValue
      })
      setGroupRuleInputs({
        ...groupRuleInputs,
        [groupId]: { type: input.type, value: input.type === 'attachment' ? 'any' : '', customExt: '' }
      })
      fetchUserData(user.id)
    } catch (error) {
      console.error("Error adding rule:", error)
    }
  }

  const handleDeleteRule = async (ruleId: number) => {
    if (!user) return
    try {
      await axios.delete(`${API_BASE_URL}/rules/${ruleId}`)
      fetchUserData(user.id)
    } catch (error) {
      console.error("Error deleting rule:", error)
    }
  }

  const handleTestWebhook = async (webhookId: number) => {
    setTestStatus({ ...testStatus, [webhookId]: 'sending' })
    try {
      await axios.post(`${API_BASE_URL}/webhooks/${webhookId}/test`)
      setTestStatus({ ...testStatus, [webhookId]: 'success' })
      setTimeout(() => {
        setTestStatus(prev => ({ ...prev, [webhookId]: '' }))
      }, 3000)
    } catch (error) {
      console.error("Error testing webhook:", error)
      setTestStatus({ ...testStatus, [webhookId]: 'error' })
    }
  }

  const getRuleBadge = (type: string, value: string) => {
    switch (type) {
      case 'sender':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded border border-blue-200">Expéditeur contient</span>
      case 'subject':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded border border-purple-200">Objet contient</span>
      case 'body':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">Message contient</span>
      case 'attachment':
        return (
          <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2 py-0.5 rounded border border-rose-200">
            📎 Pièce jointe : {value.toLowerCase() === 'any' ? 'Tous types' : `.${value.toUpperCase()}`}
          </span>
        )
      default:
        return <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2 py-0.5 rounded">{type}</span>
    }
  }

  if (currentView === 'privacy') {
    return <PrivacyPolicy onBack={() => { window.location.hash = ''; setCurrentView('dashboard'); }} />
  }

  if (currentView === 'terms') {
    return <TermsOfService onBack={() => { window.location.hash = ''; setCurrentView('dashboard'); }} />
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-medium text-slate-600">Chargement...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
            <div className="mx-auto bg-blue-50 text-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Bell size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">MailAlert</h1>
            <p className="text-slate-600 mb-8 text-sm">
              Notifications Gmail instantanées filtrées et routées vers vos canaux Discord.
            </p>
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Mail size={20} />
              Se connecter avec Google
            </button>
          </div>
        </div>

        {/* Login Footer */}
        <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200/60">
          <div className="flex justify-center items-center gap-6 mb-2">
            <button
              onClick={() => { window.location.hash = 'privacy'; setCurrentView('privacy'); }}
              className="text-slate-500 hover:text-blue-600 transition underline underline-offset-4"
            >
              Règles de confidentialité
            </button>
            <span>•</span>
            <button
              onClick={() => { window.location.hash = 'terms'; setCurrentView('terms'); }}
              className="text-slate-500 hover:text-blue-600 transition underline underline-offset-4"
            >
              Conditions d'utilisation
            </button>
          </div>
          <p>© 2026 MailAlert. Tous droits réservés.</p>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-4 sm:px-8 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <Bell size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">MailAlert</h1>
            <p className="text-xs text-slate-500">Filtrage multi-webhooks</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium">{user.email}</span>
          <button 
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition"
            title="Déconnexion"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Discord User ID Profile Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Mon Identifiant Discord (pour les pings personnels)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Renseignez votre ID Discord pour être directement mentionné (<span className="font-mono text-indigo-600 font-semibold">&lt;@votre_id&gt;</span>) lors des alertes critiques.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="ex: 345678912345678901"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
              />
              <button
                onClick={handleSaveDiscordId}
                disabled={isSavingDiscordId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-xl transition shadow-xs disabled:opacity-50 shrink-0"
              >
                {isSavingDiscordId ? 'Sauvegarde...' : saveSuccess ? '✓ Enregistré !' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>

        {/* Webhooks Header & Add Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Mes Webhooks Discord</h2>
            <p className="text-sm text-slate-500 mt-1">
              Configurez vos canaux Discord et assignez-leur des groupes de règles personnalisées.
            </p>
          </div>
          <button
            onClick={() => setShowAddWebhook(!showAddWebhook)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-xs shrink-0"
          >
            <Plus size={18} />
            Ajouter un Webhook
          </button>
        </div>

        {/* Add Webhook Form Modal/Drawer */}
        {showAddWebhook && (
          <div className="bg-blue-50/70 border border-blue-200 p-6 rounded-2xl animate-in fade-in duration-200">
            <h3 className="text-base font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Webhook size={18} className="text-blue-600" />
              Nouveau Webhook Discord
            </h3>
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nom du Webhook (ex: Alertes Urgentes, Facturation)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Canal Principal"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    URL du Webhook Discord *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://discord.com/api/webhooks/..."
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWebhook(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWebhook}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-5 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {isCreatingWebhook ? 'Création...' : 'Enregistrer le Webhook'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Webhooks List */}
        {user.webhooks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Webhook className="mx-auto text-slate-400 mb-3" size={40} />
            <h3 className="text-base font-semibold text-slate-800">Aucun Webhook configuré</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Ajoutez votre premier webhook Discord pour commencer à router vos emails selon vos critères.
            </p>
            <button
              onClick={() => setShowAddWebhook(true)}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Ajouter un Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {user.webhooks.map((wh) => (
              <div key={wh.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Webhook Header */}
                <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 text-purple-600 p-2.5 rounded-xl">
                      <Webhook size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{wh.name}</h3>
                      <p className="text-xs text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                        {wh.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestWebhook(wh.id)}
                      disabled={testStatus[wh.id] === 'sending'}
                      className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium py-2 px-3 rounded-lg transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      title="Envoyer un ping de test sur ce salon Discord"
                    >
                      {testStatus[wh.id] === 'success' ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="text-emerald-700">Envoyé !</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>{testStatus[wh.id] === 'sending' ? 'Envoi...' : 'Tester'}</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                      title="Supprimer ce webhook"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Rule Groups Container */}
                <div className="p-5 sm:p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Layers size={16} className="text-blue-500" />
                        Groupes de règles conditionnelles
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Logique <span className="font-semibold text-purple-700">OU</span> entre les groupes : si un seul groupe est valide, le message est envoyé.
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddRuleGroup(wh.id)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg transition flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Nouveau groupe (OU)
                    </button>
                  </div>

                  {wh.rule_groups.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-xs text-slate-500">Aucun groupe de règles configuré pour ce webhook.</p>
                      <button
                        onClick={() => handleAddRuleGroup(wh.id)}
                        className="mt-2 text-xs text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                      >
                        <Plus size={12} />
                        Créer un groupe de règles
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {wh.rule_groups.map((group, gIdx) => (
                        <div key={group.id} className="border border-slate-200 rounded-xl bg-slate-50/40 p-4 relative">
                          {/* Group header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-200/70 pb-2.5 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                                #{gIdx + 1}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">{group.name}</span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full border border-amber-200">
                                Conditions requises (ET)
                              </span>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition select-none">
                                <input
                                  type="checkbox"
                                  checked={Boolean(group.notify_ping)}
                                  onChange={() => handleTogglePing(group.id, Boolean(group.notify_ping))}
                                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <span>🔔 Me ping (<span className="font-mono">{user?.discord_user_id ? `<@${user.discord_user_id}>` : 'moi'}</span>)</span>
                              </label>
                              <button
                                onClick={() => handleDeleteRuleGroup(group.id)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                                title="Supprimer ce groupe"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Existing conditions in group */}
                          <div className="space-y-2 mb-3">
                            {group.rules.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-1">
                                Aucune condition dans ce groupe (ajoutez au moins un critère ci-dessous).
                              </p>
                            ) : (
                              group.rules.map((rule, rIdx) => (
                                <div key={rule.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    {rIdx > 0 && (
                                      <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                                        ET
                                      </span>
                                    )}
                                    {getRuleBadge(rule.rule_type, rule.value)}
                                    {rule.rule_type !== 'attachment' && (
                                      <span className="font-medium text-slate-800 font-mono text-xs">"{rule.value}"</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded transition ml-2"
                                    title="Supprimer cette condition"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add condition form */}
                          <form
                            onSubmit={(e) => handleAddRule(group.id, e)}
                            className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200/60"
                          >
                            <select
                              value={groupRuleInputs[group.id]?.type || 'sender'}
                              onChange={(e) => {
                                const newType = e.target.value as 'sender' | 'subject' | 'body' | 'attachment'
                                setGroupRuleInputs({
                                  ...groupRuleInputs,
                                  [group.id]: {
                                    type: newType,
                                    value: newType === 'attachment' ? 'any' : '',
                                    customExt: ''
                                  }
                                })
                              }}
                              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 sm:w-44"
                            >
                              <option value="sender">Expéditeur contient</option>
                              <option value="subject">Objet contient</option>
                              <option value="body">Corps contient</option>
                              <option value="attachment">📎 Pièce jointe</option>
                            </select>

                            {/* Conditional Input based on rule type */}
                            {(groupRuleInputs[group.id]?.type || 'sender') === 'attachment' ? (
                              <div className="flex-1 flex gap-2">
                                <select
                                  value={groupRuleInputs[group.id]?.value || 'any'}
                                  onChange={(e) =>
                                    setGroupRuleInputs({
                                      ...groupRuleInputs,
                                      [group.id]: {
                                        ...groupRuleInputs[group.id],
                                        type: 'attachment',
                                        value: e.target.value
                                      }
                                    })
                                  }
                                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="any">Toutes (n'importe quel type)</option>
                                  <option value="pdf">Document PDF (.pdf)</option>
                                  <option value="png">Image PNG (.png)</option>
                                  <option value="jpg">Image JPG / JPEG (.jpg, .jpeg)</option>
                                  <option value="docx">Document Word (.docx, .doc)</option>
                                  <option value="xlsx">Tableur Excel (.xlsx, .xls)</option>
                                  <option value="zip">Archive ZIP / RAR (.zip, .rar)</option>
                                  <option value="custom">Autre extension personnalisée...</option>
                                </select>

                                {groupRuleInputs[group.id]?.value === 'custom' && (
                                  <input
                                    type="text"
                                    placeholder="ex: csv, mp4, svg"
                                    value={groupRuleInputs[group.id]?.customExt || ''}
                                    onChange={(e) =>
                                      setGroupRuleInputs({
                                        ...groupRuleInputs,
                                        [group.id]: {
                                          ...groupRuleInputs[group.id],
                                          type: 'attachment',
                                          customExt: e.target.value
                                        }
                                      })
                                    }
                                    className="w-32 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder={
                                  (groupRuleInputs[group.id]?.type || 'sender') === 'sender'
                                    ? 'ex: @mail.com'
                                    : (groupRuleInputs[group.id]?.type || 'sender') === 'subject'
                                    ? 'ex: urgent'
                                    : 'ex: facture'
                                }
                                value={groupRuleInputs[group.id]?.value || ''}
                                onChange={(e) =>
                                  setGroupRuleInputs({
                                    ...groupRuleInputs,
                                    [group.id]: {
                                      type: groupRuleInputs[group.id]?.type || 'sender',
                                      value: e.target.value
                                    }
                                  })
                                }
                                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}

                            <button
                              type="submit"
                              className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition flex items-center justify-center gap-1 shrink-0"
                            >
                              <Plus size={14} />
                              Ajouter condition (ET)
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Main Dashboard Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 MailAlert. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => { window.location.hash = 'privacy'; setCurrentView('privacy'); }}
              className="text-slate-500 hover:text-blue-600 transition underline underline-offset-4 cursor-pointer"
            >
              Règles de confidentialité
            </button>
            <span>•</span>
            <button
              onClick={() => { window.location.hash = 'terms'; setCurrentView('terms'); }}
              className="text-slate-500 hover:text-blue-600 transition underline underline-offset-4 cursor-pointer"
            >
              Conditions d'utilisation
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
