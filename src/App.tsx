import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './app/Home';
import About from './app/About';
import NotFound from './app/NotFound';

// Lab and Builder carry the chart library, eval data and schemas; load them only when visited.
const Lab = lazy(() => import('./app/Lab'));
const LabModel = lazy(() => import('./app/LabModel'));
const Builder = lazy(() => import('./app/Builder'));
const Playground = lazy(() => import('./app/Playground'));

const loading = <p className="text-muted">Loading…</p>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="lab"
          element={
            <Suspense fallback={loading}>
              <Lab />
            </Suspense>
          }
        />
        <Route
          path="lab/:modelId"
          element={
            <Suspense fallback={loading}>
              <LabModel />
            </Suspense>
          }
        />
        <Route
          path="builder"
          element={
            <Suspense fallback={loading}>
              <Builder />
            </Suspense>
          }
        />
        <Route
          path="playground"
          element={
            <Suspense fallback={loading}>
              <Playground />
            </Suspense>
          }
        />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
