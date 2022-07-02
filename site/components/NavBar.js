import Link from "next/link";
import Image from "next/image";
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react';
import cn from 'classnames';
import { getFormValues } from '../lib/util.js';
import logoImage from '../public/assets/logo.png';

export default function NavBar({ pages }) {
    const router = useRouter();
    let [menuOpen, setMenuOpen] = useState(false);
    const [menuOpenReason, setMenuOpenReason] = useState(false);
    const [visible, setVisible] = useState(true);
    const prevScrollpos = useRef();
    const menuContent = useRef(null);
    const scrollExpected = useRef(null);

    function searchSubmit(e) {
        e.preventDefault();
        const data = getFormValues(e.target);
        if (!data.content) return;
        router.push('/search?' + new URLSearchParams(data));
    }
    function toggleMenu(reason) {
        if (menuOpen) {
            if (reason === menuOpenReason)
                setMenuOpen(false);
            else
                setMenuOpenReason(reason);
        } else {
            scrollExpected.current = true;
            setMenuOpen(true);
            setMenuOpenReason(reason);
        }

    }
    useEffect(() => {
        function onScroll() {
            if (scrollExpected.current) return scrollExpected.current = false;
            let currentScrollPos = window.pageYOffset;
            let visible = prevScrollpos.current >= currentScrollPos;
            setVisible(visible);
            prevScrollpos.current = currentScrollPos;
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return <header className={'sticky z-50 transition-[top] duration-300'} style={{ top: (visible) ? 0 : `-${62 + (menuContent?.current?.clientHeight || 0)}px` }}>
        <nav className={"bg-white border-gray-200 dark:border-b-gray-500 dark:border-x-0 dark:border-t-0 border py-2.5 px-3 dark:bg-gray-800 w-full mx-auto"}>
            <div className="flex flex-wrap justify-between items-center ">
                <Link href="/">
                    <a className="flex items-center">
                        <div className="mr-3 h-6 w-6 dark:invert invert-0">
                            <Image src={logoImage} layout="fill" alt="My Logo" >
                            </Image>
                        </div>
                        <span className="text-xl font-semibold dark:text-white">Town of Lieto</span>
                    </a>
                </Link>

                <div className="flex md:order-2">
                    <button onClick={() => toggleMenu('search')} type="button" data-collapse-toggle="mobile-menu-3" aria-controls="mobile-menu-3" aria-expanded={menuOpen} className="md:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 mr-1" >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                    </button>
                    <div className="hidden relative md:block h-[40px]">
                        <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                        </div>
                        <form onSubmit={searchSubmit}>
                            <input name="content" type="text" id="search-navbar" className="h-full block p-2 pl-10 w-full text-gray-900 bg-gray-50 rounded-lg border border-gray-300 sm:text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search...">
                            </input>
                        </form>
                    </div>
                    <button onClick={() => toggleMenu('hamburger')} data-collapse-toggle="mobile-menu-3" type="button" className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="mobile-menu-3" aria-expanded={menuOpen}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                        <svg className="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    </button>
                </div>

                <div ref={menuContent} className={cn({ ['hidden']: !menuOpen, /*['absolute top-10 right-3 bg-white rounded-lg p-4']: menuOpen*/ }) + " w-full justify-between items-center md:flex md:static md:w-auto md:order-1"} id="mobile-menu-3">
                    <div className="relative mt-3 md:hidden h-[40px]">
                        <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                        </div>
                        <form onSubmit={searchSubmit}>
                            <input name="content" type="text" id="search-navbar" className="block p-2 pl-10 w-full text-gray-900 bg-gray-50 rounded-lg border border-gray-300 sm:text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search...">
                            </input>
                        </form>
                    </div>
                    <ul className="flex flex-col mt-4 md:flex-row md:space-x-8 md:mt-0 md:text-sm md:font-medium">
                        {
                            pages.map(page =>
                                (router.pathname === page.href) ?
                                    <li key={page.href}><Link href={page.href}>
                                        <a className="block py-2 pr-4 pl-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white" aria-current="page">{page.name}</a>
                                    </Link></li> :
                                    <li key={page.href}><Link href={page.href}>
                                        <a className="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 md:dark:hover:text-white dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">{page.name}</a>
                                    </Link></li>
                            )
                        }
                    </ul>
                </div>
            </div>
        </nav >
    </header>;
}