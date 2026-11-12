import "./globals.css";

export const metadata = {
  title: "24C Clothing | Timeless Essentials",
  description: "Discover timeless everyday essentials from 24C Clothing."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
