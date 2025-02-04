import 'tailwindcss/tailwind.css'; // ✅ Force Tailwind load
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
