// src/components/notFound/NotFound.js
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./NotFound.css";

export default function NotFound() {
    const { t } = useTranslation();

    return (
        <section className="nf" id="not-found">
            <div className="nf__card">
                <div className="nf__terminal-bar" aria-hidden="true">
                    <span className="nf__dot" />
                    <span className="nf__dot" />
                    <span className="nf__dot" />
                    <span className="nf__terminal-title">shellty@web:~</span>
                </div>

                <div className="nf__body">
                    <p className="nf__line" aria-hidden="true">
                        <span className="nf__prompt">$</span> {t("notFound.command")}
                    </p>
                    <h1 className="nf__code">
                        {t("notFound.code")}
                        <span className="nf__caret" aria-hidden="true" />
                    </h1>
                    <p className="nf__desc">{t("notFound.desc")}</p>

                    <Link to="/" className="btn-glass btn-glass--primary nf__cta">
                        {t("notFound.cta")}
                    </Link>
                </div>
            </div>
        </section>
    );
}
