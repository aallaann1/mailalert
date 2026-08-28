import React from 'react'
import { FileText, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'

interface Props {
  onBack: () => void;
}

export const TermsOfService: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-4 sm:px-8 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">MailAlert</h1>
            <p className="text-xs text-slate-500">Conditions Générales d'Utilisation</p>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Conditions Générales d'Utilisation (CGU)</h2>
          <p className="text-sm text-slate-500 mt-2">Dernière mise à jour : 28 août 2026</p>
        </div>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="text-blue-600" size={20} />
            1. Objet du Service
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>MailAlert</strong> est une plateforme logicielle permettant aux utilisateurs d'automatiser l'analyse de leurs e-mails Gmail entrants et de router des notifications instantanées vers un ou plusieurs canaux Discord selon des critères et règles personnalisées définis par l'utilisateur.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            2. Accès et Authentification
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            L'accès aux fonctionnalités de MailAlert requiert une authentification via le protocole sécurisé Google OAuth. En vous connectant, vous autorisez MailAlert à souscrire aux notifications d'événements de votre boîte de réception Gmail via Google Cloud Pub/Sub afin d'exécuter vos règles de filtrage.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-blue-600" size={20} />
            3. Responsabilité de l'Utilisateur
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            L'utilisateur s'engage à :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li>Fournir des URL de Webhooks Discord dont il a la pleine propriété ou les droits d'administration nécessaires.</li>
            <li>Ne pas utiliser le service à des fins frauduleuses, illicites ou pour contourner des mesures de sécurité tierces.</li>
            <li>Garder confidentielles ses informations d'accès et URL de webhooks Discord afin d'éviter tout accès non autorisé à ses notifications.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="text-blue-600" size={20} />
            4. Disponibilité du Service et Limite de Responsabilité
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            MailAlert met en œuvre tous les moyens raisonnables pour garantir une haute disponibilité et un délai d'alerte proche du temps réel (near zero-delay). Toutefois, le bon acheminement des alertes dépend des infrastructures tierces (Google Cloud Platform, API Gmail, Discord). MailAlert ne saurait être tenu responsable des retards, pannes ou indisponibilités imputables à ces services tiers ou aux réseaux de télécommunication.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900">5. Résiliation et Révocation</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Vous pouvez cesser d'utiliser MailAlert à tout moment en supprimant vos règles ou en révoquant les accès accordés depuis votre compte Google. MailAlert se réserve le droit de suspendre temporairement ou définitivement l'accès à un utilisateur en cas de violation caractérisée des présentes conditions.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900">6. Modifications des Conditions</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nous nous réservons le droit de mettre à jour ou modifier les présentes conditions d'utilisation à tout moment afin de refléter l'évolution des fonctionnalités ou du cadre réglementaire.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-100 pt-6">
          <h3 className="text-base font-bold text-slate-900">7. Contact</h3>
          <p className="text-sm text-slate-600">
            Pour toute demande d'assistance ou question relative à ces conditions, contactez-nous à : <span className="font-semibold text-slate-800">support@mailalert.app</span>.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 MailAlert. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
