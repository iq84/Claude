import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './app/Home';
import About from './app/About';
import NotFound from './app/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
