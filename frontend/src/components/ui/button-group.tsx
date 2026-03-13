import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Children, cloneElement, type ReactElement } from "react";
import type { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonGroupProps {
	className?: string;
	orientation?: "horizontal" | "vertical";
	children: ReactElement<
		React.ComponentProps<"button"> &
			VariantProps<typeof buttonVariants> & {
				asChild?: boolean;
			}
	>[];
}

export const ButtonGroup = ({
	className,
	orientation = "horizontal",
	children,
}: ButtonGroupProps) => {
	const totalButtons = Children.count(children);
	const isHorizontal = orientation === "horizontal";
	const isVertical = orientation === "vertical";

	return (
		<div
			className={cn(
				"flex",
				{
					"flex-col": isVertical,
					"w-fit": isVertical,
				},
				className,
			)}
		>
			{Children.map(children, (child, index) => {
				const isFirst = index === 0;
				const isLast = index === totalButtons - 1;

				return cloneElement(child, {
					className: cn(
						{
							"rounded-s-none": isHorizontal && !isFirst,
							"rounded-e-none": isHorizontal && !isLast,
							"border-s-0": isHorizontal && !isFirst,

							"rounded-t-none": isVertical && !isFirst,
							"rounded-b-none": isVertical && !isLast,
							"border-t-0": isVertical && !isFirst,
						},
						child.props.className,
					),
				});
			})}
		</div>
	);
};
