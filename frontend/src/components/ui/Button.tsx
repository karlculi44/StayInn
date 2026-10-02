import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };
const styles = { primary: "bg-sage text-white hover:bg-sage-dark", secondary: "border border-sage text-sage hover:bg-sage/10", ghost: "text-sage hover:bg-sage/10" };
export function Button({ className = "", variant = "primary", ...props }: ButtonProps) { return <button className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold ${styles[variant]} ${className}`} {...props} />; }
export function ButtonLink({ className = "", variant = "primary", ...props }: LinkProps & { variant?: ButtonProps["variant"] }) { return <Link className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold ${styles[variant]} ${className}`} {...props} />; }