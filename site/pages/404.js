import Head from "next/head";
import styles from '../styles/404.module.scss';

export default function Custom404() {
    return <>
        <Head>
            <title>404 - Page not found</title>
        </Head>
        <div>
            <div className={styles.container}>
                <div className={styles.glitch} data-text="404">404</div>
                <div className={styles.glow}>404</div>
                <p className={styles.subtitle}>PAGE NOT FOUND</p>
            </div>
        </div>
    </>
}