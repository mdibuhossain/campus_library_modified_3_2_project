import { useEffect } from "react";
import { SITE, absolute } from "../seo/siteMeta.mjs";

const upsert = (selector, create, attr, value) => {
    if (!value) return undefined;
    let tag = document.head.querySelector(selector);
    const created = !tag;
    if (!tag) {
        tag = create();
        document.head.appendChild(tag);
    }
    const previous = tag.getAttribute(attr);
    tag.setAttribute(attr, value);
    return () => {
        if (created) tag.remove();
        else if (previous !== null) tag.setAttribute(attr, previous);
    };
};

const named = (name, content) =>
    upsert(`meta[name="${name}"]`, () => {
        const el = document.createElement("meta");
        el.setAttribute("name", name);
        return el;
    }, "content", content);

const property = (prop, content) =>
    upsert(`meta[property="${prop}"]`, () => {
        const el = document.createElement("meta");
        el.setAttribute("property", prop);
        return el;
    }, "content", content);

const canonical = (href) =>
    upsert('link[rel="canonical"]', () => {
        const el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        return el;
    }, "href", href);

const useDocumentMeta = ({ title, description, keywords, image, noindex, type = "website" }) => {
    useEffect(() => {
        const previousTitle = document.title;
        if (title) document.title = title;

        const url = absolute(window.location.pathname);
        const card = image ? (image.startsWith("http") ? image : `${SITE.url}${image}`) : `${SITE.url}${SITE.image}`;
        const robots = noindex
            ? "noindex, nofollow"
            : "index, follow, max-image-preview:large, max-snippet:-1";

        const restores = [
            named("description", description),
            named("keywords", keywords),
            named("robots", robots),
            canonical(noindex ? undefined : url),
            property("og:title", title),
            property("og:description", description),
            property("og:url", url),
            property("og:type", type),
            property("og:image", card),
            named("twitter:card", "summary_large_image"),
            named("twitter:title", title),
            named("twitter:description", description),
            named("twitter:image", card),
        ];

        return () => {
            document.title = previousTitle;
            restores.forEach((r) => r?.());
        };
    }, [title, description, keywords, image, noindex, type]);
};

export default useDocumentMeta;
