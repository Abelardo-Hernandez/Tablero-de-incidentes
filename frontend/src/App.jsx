import {
    lazy,
    Suspense
} from 'react';

import {
    Navigate,
    Route,
    Routes
} from 'react-router';

import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';

import MainLayout from './layouts/MainLayout';

import ProtectedRoute from './routes/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const IncidenciasPage = lazy(() => import('./pages/incidencias/IncidenciasPage'));
const UsuariosPage = lazy(() => import('./pages/usuarios/UsuariosPage'));
const AreasPage = lazy(() => import('./pages/areas/AreasPage'));
const LineasPage = lazy(() => import('./pages/lineas/LineasPage'));
const TurnosPage = lazy(() => import('./pages/turnos/TurnosPage'));
const TiposFallaPage = lazy(() => import('./pages/tipos-falla/TiposFallaPage'));
const UnidadesNegocioPage = lazy(() => import('./pages/unidades-negocio/UnidadesNegocioPage'));
const ReportesPage = lazy(() => import('./pages/reportes/ReportesPage'));
const TvPage = lazy(() => import('./pages/tv/TvPage'));
const ConfiguracionPage = lazy(() => import('./pages/configuracion/ConfiguracionPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function CargandoPagina() {
    return (
        <main className="grid min-h-[50vh] place-items-center">
            <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                <p className="mt-4 text-sm font-semibold text-slate-500">
                    Cargando vista...
                </p>
            </div>
        </main>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Suspense fallback={<CargandoPagina />}>
                    <Routes>
                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                        <Route
                            element={
                                <ProtectedRoute requiereResponsableArea />
                            }
                        >
                            <Route
                                index
                                element={<DashboardPage />}
                            />
                        </Route>

                        <Route
                            path="incidencias"
                            element={<IncidenciasPage />}
                        />

                        <Route
                            path="usuarios"
                            element={<UsuariosPage />}
                        />

                        <Route
                            path="areas"
                            element={<AreasPage />}
                        />

                        <Route
                            path="lineas"
                            element={<LineasPage />}
                        />

                        <Route
                            path="turnos"
                            element={<TurnosPage />}
                        />

                        <Route
                            path="tipos-falla"
                            element={<TiposFallaPage />}
                        />

                        <Route
                            element={
                                <ProtectedRoute requiereSuperAdmin />
                            }
                        >
                            <Route
                                path="unidades-negocio"
                                element={<UnidadesNegocioPage />}
                            />
                        </Route>

                        <Route
                            element={
                                <ProtectedRoute requiereResponsableArea />
                            }
                        >
                            <Route
                                path="reportes"
                                element={<ReportesPage />}
                            />
                        </Route>

                        <Route
                            path="tv"
                            element={<TvPage />}
                        />

                        <Route
                            path="configuracion"
                            element={<ConfiguracionPage />}
                        />
                    </Route>
                </Route>

                <Route
                    path="/inicio"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

                <Route
                    path="*"
                    element={<NotFoundPage />}
                />
                    </Routes>
                </Suspense>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
