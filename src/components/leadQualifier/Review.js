import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaStar } from 'react-icons/fa';

export default function Review({ index, compact = false }) {
    const { t } = useTranslation();
    const reviews = t('services.reviews.items', { returnObjects: true, defaultValue: [] });
    const review = Array.isArray(reviews) ? reviews[index] ?? reviews[0] : null;
    if (!review) return null;
    const rating = review.rating || 5;

    return (
        <figure className={`lq-card lq-review${compact ? ' lq-review--compact' : ''}`}>
            <span
                className="lq-review__stars"
                role="img"
                aria-label={t('services.reviews.ratingAria', { rating })}
            >
                {Array.from({ length: rating }, (_, star) => (
                    <FaStar key={star} aria-hidden="true" />
                ))}
            </span>
            <blockquote className="lq-review__text">{review.text}</blockquote>
            <figcaption className="lq-review__meta">
                {review.author} · {review.source}
            </figcaption>
        </figure>
    );
}
