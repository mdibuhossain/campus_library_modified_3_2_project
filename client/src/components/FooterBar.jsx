import { NavLink } from 'react-router-dom';

const SOCIALS = [
    {
        name: 'Facebook',
        href: 'https://www.facebook.com/mdibuhossain',
        path: 'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z',
    },
    {
        name: 'Instagram',
        href: 'https://instagram.com/mdibuhossain',
        path: 'M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z',
    },
    {
        name: 'GitHub',
        href: 'https://github.com/mdibuhossain',
        path: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z',
    },
    {
        name: 'YouTube',
        href: 'https://youtube.com/expertinall',
        path: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z',
    },
];

const LINKS = [
    { name: 'Home', to: '/' },
    { name: 'Search', to: '/search' },
    { name: 'Upload', to: '/request' },
    { name: 'Classroom', to: '/classroom' },
];

const FooterBar = () => {
    // year only; recomputed per mount so it cannot go stale in a long session
    const year = new Date().getFullYear();

    return (
        // `mt-auto` puts this at the bottom of PageLayout's flex column. The old
        // `sticky top-[100vh]` hack is no longer needed now that the layout uses
        // minHeight instead of a fixed height.
        <footer className="mt-auto bg-gray-900 text-gray-400">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
                    {/* identity */}
                    <div className="sm:col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2">
                            <img className="w-9" src="/assets/images/logo.webp" alt="" />
                            <span className="text-[#a8ff01] font-rubik_doodle text-lg">
                                CAMPUS CLASSROOM
                            </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed">
                            Books, question papers and syllabus for every department — plus
                            classrooms for coursework, all in one place.
                        </p>
                    </div>

                    {/* quick links -- previously the footer had none */}
                    <nav aria-label="Footer navigation">
                        <h2 className="text-gray-200 text-sm font-semibold uppercase tracking-wide">
                            Explore
                        </h2>
                        <ul className="mt-3 space-y-2 text-sm">
                            {LINKS.map((link) => (
                                <li key={link.name}>
                                    <NavLink to={link.to} className="hover:text-white transition-colors">
                                        {link.name}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* socials */}
                    <div>
                        <h2 className="text-gray-200 text-sm font-semibold uppercase tracking-wide">
                            Follow
                        </h2>
                        <div className="flex gap-4 mt-3">
                            {SOCIALS.map((s) => (
                                <a
                                    key={s.name}
                                    href={s.href}
                                    aria-label={s.name}
                                    title={s.name}
                                    className="hover:text-white transition-colors"
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fillRule="evenodd" d={s.path} clipRule="evenodd" />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-800 text-center sm:text-left">
                    <span className="text-sm">
                        © {year}{' '}
                        <a
                            href="https://www.linkedin.com/in/mdibuhossain/"
                            className="hover:text-white hover:underline transition-colors"
                            target="_blank"
                            rel="noreferrer"
                        >
                            MD. Ibrahim Hossain
                        </a>
                        . All Rights Reserved.
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default FooterBar;
