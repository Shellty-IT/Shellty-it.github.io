import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/navbar/Navbar";
import Home from "./components/home/Home";
import CloudBackground from "./background/CloudBackground";
import SeoManager from "./seo/SeoManager";

import './App.css';

const About      = lazy(() => import(/* webpackPrefetch: true */ "./components/about/About"));
const Services    = lazy(() => import(/* webpackPrefetch: true */ "./components/services/Services"));
const Experience  = lazy(() => import(/* webpackPrefetch: true */ "./components/experience/Experience"));
const Skills      = lazy(() => import(/* webpackPrefetch: true */ "./components/skills/Skills"));
const Portfolio   = lazy(() => import(/* webpackPrefetch: true */ "./components/portfolio/Portfolio"));
const Contact     = lazy(() => import(/* webpackPrefetch: true */ "./components/contact/Contact"));
const NotFound    = lazy(() => import("./components/notFound/NotFound"));
const CustomCursor = lazy(() => import("./components/customCursor"));

function App() {
    return (
        <Router>
            <SeoManager />
            <CloudBackground />

            <Suspense fallback={null}>
                <CustomCursor />
            </Suspense>

            <Navbar />

            <main className="main-content">
                <Suspense fallback={null}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/experience" element={<Experience />} />
                        <Route path="/skills" element={<Skills />} />
                        <Route path="/portfolio" element={<Portfolio />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </main>
        </Router>
    );
}

export default App;
