import '../styles/globals.css'
import Image from 'next/image';
import nextLogo from '../public/assets/next-black.svg';
import NavBar from '../components/NavBar';

const PAGES = [
  {
    name: 'Home',
    href: '/',
  },
  {
    name: 'Learn',
    href: '/learn',
  },
  {
    name: 'About',
    href: '/about',
  },
  {
    name: 'News',
    href: '/news',
  },
]

function MyApp({ Component, pageProps }) {
  if (pageProps.fullscreen) {
    return <div className='min-h-[100vh] max-h-[100vh] h-[100vh] flex'>
      <Component {...pageProps} />
    </div>
  }
  return <div className='dark flex flex-col min-h-[100vh] justify-center text-white'>
    <NavBar pages={PAGES}></NavBar>
    <main className='grow p-4 bg-sky-900'>
      <Component {...pageProps} />
    </main>
    <footer className={`dark:bg-gray-800 dark:border-t-gray-500 dark:border-x-0 dark:border-b-0 py-4 flex border border-[#eaeaea] justify-center items-center gap-3`}>
      © {new Date().getFullYear()} Miika Tuominen
      <span>|</span>
      <a
        href="https://nextjs.org"
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 items-center"
      >
        Powered by{' '}
        <Image className='dark:invert' src={nextLogo} alt="Next.js Logo" width={207 * 0.4} height={124 * 0.4} />
      </a>
    </footer>
  </div>
}

export default MyApp
