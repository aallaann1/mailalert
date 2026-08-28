import React from 'react'
import { Shield, ArrowLeft, Lock, Database, Eye, Bell, Trash2 } from 'lucide-react'

interface Props {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-4 sm:px-8 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">MailAlert</h1>
            <p className="text-xs text-slate-500">Politique de Confidentialité</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Retour à l'application
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 my-6 flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="border-b border-slate-100 pb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Politique de Confidentialité</h2>
          <p className="text-sm text-slate-500 mt-2">Dernière mise à jour : 28 août 2026</p>
        </div>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="text-blue-600" size={20} />
            1. Introduction et Engagement
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            L'application <strong>MailAlert</strong> accorde une importance primordiale à la protection de la vie privée et des données personnelles de ses utilisateurs. Cette politique détaille les données que nous collectons, la façon dont elles sont utilisées, ainsi que vos droits conformément au Règlement Général sur la Protection des Données (RGPD) et aux exigences de sécurité de Google.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="text-blue-600" size={20} />
            2. Données collectées
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Dans le cadre de l'utilisation du service MailAlert, nous collectons et traitons uniquement les données strictement nécessaires au fonctionnement de l'alerte :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li><strong>Identifiant Google & Adresse e-mail</strong> : nécessaires pour vous identifier et autoriser la surveillance de votre boîte Gmail.</li>
            <li><strong>Jetons d'accès OAuth (Refresh Token)</strong> : stockés de manière sécurisée et chiffrée afin de maintenir la synchronisation avec l'API Gmail sans stocker votre mot de passe.</li>
            <li><strong>Règles de filtrage et Webhooks Discord</strong> : les critères que vous définissez (mots-clés, expéditeurs, sujets, pièces jointes) et les URL des webhooks Discord de destination.</li>
            <li><strong>Identifiant Discord utilisateur (facultatif)</strong> : utilisé uniquement pour vous mentionner personnellement lors des alertes critiques.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Eye className="text-blue-600" size={20} />
            3. Respect des Règles relatives aux données utilisateur des API Google
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            L'utilisation et le transfert par MailAlert à toute autre application des informations reçues des API Google respecteront la 
            <a 
              href="https://developers.google.com/terms/api-services-user-data-policy" 
              target="_blank" 
              rel="noreferrer"
              className="text-blue-600 font-semibold hover:underline ml-1"
            >
              Politique relative aux données utilisateur des services d'API Google
            </a>, y compris les exigences d'utilisation limitée (Limited Use requirements).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li><strong>Aucune conservation des e-mails</strong> : Nous ne stockons pas le contenu de vos messages ni leurs pièces jointes sur nos serveurs. L'analyse des e-mails s'effectue en mémoire vive à la réception de la notification et est immédiatement supprimée après évaluation.</li>
            <li><strong>Aucune utilisation publicitaire</strong> : Vos données ne sont jamais vendues, louées, partagées avec des tiers publicitaires, ni utilisées pour entraîner des modèles d'intelligence artificielle généralistes.</li>
            <li><strong>Portée minimale (Least Privilege)</strong> : Nous sollicitons uniquement l'accès en lecture seule (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">gmail.readonly</code>) indispensable à l'application de vos filtres.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell className="text-blue-600" size={20} />
            4. Utilisation des Webhooks Discord
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Lorsqu'un e-mail reçu satisfait l'un de vos groupes de critères, un aperçu comprenant l'expéditeur, l'objet, un extrait du message et le nom des pièces jointes est transmis de manière sécurisée via HTTPS au Webhook Discord configuré par vos soins.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="text-blue-600" size={20} />
            5. Vos Droits et Suppression des Données
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Conformément à la réglementation RGPD, vous disposez d'un droit d'accès, de rectification et de suppression totale de vos données. Vous pouvez à tout moment :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li>Supprimer vos règles et Webhooks directement depuis votre tableau de bord.</li>
            <li>Révoquer les accès de MailAlert à votre compte Google depuis la page officielle <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Sécurité de votre compte Google</a>.</li>
            <li>Demander la suppression complète de votre compte et de vos données en nous contactant directement.</li>
          </ul>
        </section>

        <section className="space-y-2 border-t border-slate-100 pt-6">
          <h3 className="text-base font-bold text-slate-900">6. Contact</h3>
          <p className="text-sm text-slate-600">
            Pour toute question concernant cette politique ou vos données personnelles, vous pouvez contacter le responsable de traitement à l'adresse suivante : <span className="font-semibold text-slate-800">contact@mailalert.app</span>.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 MailAlert. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
