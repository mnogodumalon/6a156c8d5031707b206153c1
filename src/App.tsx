import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import ReisePage from '@/pages/ReisePage';
import KategoriePage from '@/pages/KategoriePage';
import BudgetpostenPage from '@/pages/BudgetpostenPage';
import AusgabePage from '@/pages/AusgabePage';
import PublicFormReise from '@/pages/public/PublicForm_Reise';
import PublicFormKategorie from '@/pages/public/PublicForm_Kategorie';
import PublicFormBudgetposten from '@/pages/public/PublicForm_Budgetposten';
import PublicFormAusgabe from '@/pages/public/PublicForm_Ausgabe';
// <public:imports>
// </public:imports>
// <custom:imports>
const ReiseplanungPage = lazy(() => import('@/pages/intents/ReiseplanungPage'));
const AusgabenErfassungPage = lazy(() => import('@/pages/intents/AusgabenErfassungPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a156c72cca2612665962e67" element={<PublicFormReise />} />
              <Route path="public/6a156c77458df5384d2f2876" element={<PublicFormKategorie />} />
              <Route path="public/6a156c78ee9b9e72eca1f82e" element={<PublicFormBudgetposten />} />
              <Route path="public/6a156c7a28f199a3c226f897" element={<PublicFormAusgabe />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="reise" element={<ReisePage />} />
                <Route path="kategorie" element={<KategoriePage />} />
                <Route path="budgetposten" element={<BudgetpostenPage />} />
                <Route path="ausgabe" element={<AusgabePage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/reiseplanung" element={<Suspense fallback={null}><ReiseplanungPage /></Suspense>} />
                <Route path="intents/ausgaben-erfassung" element={<Suspense fallback={null}><AusgabenErfassungPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
