import Link from "next/link";
import { asset } from "@/lib/utils";

type NavLinkProps = React.ComponentProps<"a"> & { href: string; standalone?: boolean };

/** Base City is its own full-screen page outside the app, so it needs a plain link and a full page load. */
export function NavLink({ href, standalone, ...rest }: NavLinkProps) {
  return standalone ? <a href={asset(href)} {...rest} /> : <Link href={href} {...rest} />;
}
