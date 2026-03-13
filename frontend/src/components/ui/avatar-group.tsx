import * as React from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AvatarProps = React.ComponentProps<typeof Avatar>;

interface AvatarGroupProps extends React.ComponentProps<"div"> {
	children: React.ReactElement<AvatarProps>[];
	max?: number;
}

const AvatarGroup = ({
	children,
	max,
	className,
	...props
}: AvatarGroupProps) => {
	const totalAvatars = React.Children.count(children);
	const displayedAvatars = React.Children.toArray(children)
		.slice(0, max)
		.reverse();
	const remainingAvatars = max ? Math.max(totalAvatars - max, 1) : 0;

	return (
		<div
			className={cn("flex items-center flex-row-reverse", className)}
			{...props}
		>
			{remainingAvatars > 0 && (
				<Avatar className="-ml-2 hover:z-10 relative ring-2 ring-background">
					<AvatarFallback className="bg-muted-foreground text-white">
						+{remainingAvatars}
					</AvatarFallback>
				</Avatar>
			)}
			{displayedAvatars.map((avatar, index) => {
				if (!React.isValidElement(avatar)) return null;

				return (
					<div key={index} className="-ml-2 hover:z-10 relative">
						{React.cloneElement(avatar as React.ReactElement<AvatarProps>, {
							className: "ring-2 ring-background",
						})}
					</div>
				);
			})}
		</div>
	);
};

export { AvatarGroup };
