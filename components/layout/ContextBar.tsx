'use client';

import { useGlobalContext } from "@/context/GlobalContext";
import { ChevronRight, Home, Building2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export function ContextBar() {
    const { context, navigateUp, selectProperty, selectBuilding } = useGlobalContext();

    // Helper to render a breadcrumb item
    const BreadcrumbItem = ({
        icon: Icon,
        label,
        isActive,
        onClick
    }: {
        icon: any;
        label: string;
        isActive: boolean;
        onClick?: () => void;
    }) => (
        <div className={cn("flex items-center group", onClick && "cursor-pointer")} onClick={onClick}>
            <Icon className={cn("h-4 w-4 mr-2", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className={cn("text-xs font-medium uppercase tracking-wider", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                {label}
            </span>
        </div>
    );

    const Separator = () => <ChevronRight className="h-4 w-4 text-muted-foreground/40 mx-2" />;

    return (
        <div className="w-full h-14 border-b border-border bg-white/50 backdrop-blur-sm flex items-center px-8 z-40 sticky top-0">
            <div className="flex items-center">
                {/* Organization (Always present) */}
                <BreadcrumbItem
                    icon={Home}
                    label={context.organization?.name || "Loading..."}
                    isActive={!context.property}
                    onClick={() => {
                        if (context.property) navigateUp(); // Simplistic implementation, ideally jumps to root
                    }}
                />

                {context.property && (
                    <>
                        <Separator />
                        <BreadcrumbItem
                            icon={Building2}
                            label={context.property.name}
                            isActive={!context.building}
                            onClick={() => {
                                if (context.building) navigateUp();
                            }}
                        />
                    </>
                )}

                {context.building && (
                    <>
                        <Separator />
                        <BreadcrumbItem
                            icon={Layers}
                            label={context.building.name}
                            isActive={!context.floor}
                            onClick={() => {
                                if (context.floor) navigateUp();
                            }}
                        />
                    </>
                )}

                {context.floor && (
                    <>
                        <Separator />
                        <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-brand-green mr-2 animate-pulse"></span>
                            <span className="text-sm font-bold text-foreground">
                                {context.floor.name}
                            </span>
                        </div>
                    </>
                )}
            </div>

            <div className="ml-auto flex items-center space-x-4">
                {/* Status Indicators could go here */}
                <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-brand-green"></span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">System Operational</span>
                </div>
            </div>
        </div>
    );
}
