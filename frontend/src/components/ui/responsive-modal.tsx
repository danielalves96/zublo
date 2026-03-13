"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Modal = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalClose = DialogPrimitive.Close;
const ModalPortal = DialogPrimitive.Portal;

const ModalOverlay = (props: DialogPrimitive.DialogOverlayProps) => {
	return (
		<DialogPrimitive.Overlay
			{...props}
			className={cn(
				"fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
				"data-[state=open]:animate-in data-[state=closed]:animate-out",
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
				props.className,
			)}
		/>
	);
};

const ModalVariants = cva(
	cn(
		"fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out",
		"data-[state=open]:animate-in data-[state=closed]:animate-out",
		"data-[state=closed]:duration-300 data-[state=open]:duration-500 overflow-y-auto",
		"lg:left-[50%] lg:top-[50%] lg:w-full lg:max-w-lg lg:translate-x-[-50%] lg:translate-y-[-50%]",
		"lg:border lg:duration-200 lg:data-[state=open]:animate-in lg:data-[state=closed]:animate-out",
		"lg:data-[state=closed]:fade-out-0 lg:data-[state=open]:fade-in-0",
		"lg:data-[state=closed]:zoom-out-95 lg:data-[state=open]:zoom-in-95 lg:rounded-xl",
	),
	{
		variants: {
			side: {
				top: "inset-x-0 top-0 border-b rounded-b-xl max-h-[80dvh] lg:h-fit data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
				bottom:
					"inset-x-0 bottom-0 border-t lg:h-fit max-h-[80dvh] rounded-t-xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
				left: "inset-y-0 left-0 h-full lg:h-fit w-3/4 border-r rounded-r-xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
				right:
					"inset-y-0 right-0 h-full lg:h-fit w-3/4 border-l rounded-l-xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
			},
		},
		defaultVariants: {
			side: "bottom",
		},
	},
);

type ModalContentProps = DialogPrimitive.DialogContentProps &
	VariantProps<typeof ModalVariants>;

const ModalContent = ({
	side = "bottom",
	className,
	children,
	...props
}: ModalContentProps) => {
	return (
		<ModalPortal>
			<ModalOverlay />
			<DialogPrimitive.Content
				{...props}
				aria-describedby="responsive-modal-description"
				className={cn(ModalVariants({ side }), className)}
			>
				{children}
				<ModalClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</ModalClose>
			</DialogPrimitive.Content>
		</ModalPortal>
	);
};

const ModalHeader = (props: HTMLAttributes<HTMLDivElement>) => (
	<div
		{...props}
		className={cn(
			"flex flex-col space-y-2 text-center sm:text-left",
			props.className,
		)}
	/>
);

const ModalFooter = (props: HTMLAttributes<HTMLDivElement>) => (
	<div
		{...props}
		className={cn(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
			props.className,
		)}
	/>
);

const ModalTitle = (props: DialogPrimitive.DialogTitleProps) => (
	<DialogPrimitive.Title
		{...props}
		className={cn("text-lg font-semibold text-foreground", props.className)}
	/>
);

const ModalDescription = (props: DialogPrimitive.DialogDescriptionProps) => (
	<DialogPrimitive.Description
		{...props}
		className={cn("text-sm text-muted-foreground", props.className)}
	/>
);

export {
	Modal,
	ModalPortal,
	ModalOverlay,
	ModalTrigger,
	ModalClose,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalTitle,
	ModalDescription,
};
