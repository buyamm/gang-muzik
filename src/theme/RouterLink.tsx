import { forwardRef, type AnchorHTMLAttributes } from "react";
import { Link } from "react-router";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string };

/** Lets Astryx `href` props (Button, Link, nav items) navigate through react-router. */
export const RouterLink = forwardRef<HTMLAnchorElement, Props>(function RouterLink({ href = "", ...rest }, ref) {
  const external = /^(https?:|mailto:|tel:|#)/.test(href) || rest.target === "_blank" || "download" in rest;
  if (external) return <a ref={ref} href={href} {...rest} />;
  return <Link ref={ref} to={href} {...rest} />;
});
