import { useEffect } from "react";

/* Sets <title> and a couple of meta tags for a page, restoring the previous
 * values on unmount.
 *
 * Replaces react-helmet, which is unmaintained (last published 2020) and whose
 * react-side-effect dependency still uses UNSAFE_componentWillMount -- the
 * source of the "Using UNSAFE_componentWillMount in strict mode" warning
 * attributed to SideEffect(NullComponent). Only one page ever used it, for a
 * title and two meta tags, which is a few lines of DOM work.
 */
const setMeta = (name, content) => {
    if (!content) return undefined;
    let tag = document.head.querySelector(`meta[name="${name}"]`);
    const created = !tag;
    if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
    }
    const previous = tag.getAttribute("content");
    tag.setAttribute("content", content);
    return () => {
        if (created) tag.remove();
        else if (previous !== null) tag.setAttribute("content", previous);
    };
};

const useDocumentMeta = ({ title, description, keywords }) => {
    useEffect(() => {
        const previousTitle = document.title;
        if (title) document.title = title;
        const restoreDescription = setMeta("description", description);
        const restoreKeywords = setMeta("keywords", keywords);
        return () => {
            document.title = previousTitle;
            restoreDescription?.();
            restoreKeywords?.();
        };
    }, [title, description, keywords]);
};

export default useDocumentMeta;
