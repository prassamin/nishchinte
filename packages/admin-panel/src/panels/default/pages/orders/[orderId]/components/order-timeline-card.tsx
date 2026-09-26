"use client";

import { History, Clock, User, ShieldCheck } from "lucide-react";
import type { OrderSummaryItem } from "@nishchinte/server/actions";

function formatTimelineDate(date: Date | string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OrderTimelineCardProps {
  order: OrderSummaryItem;
}

export function OrderTimelineCard({ order }: OrderTimelineCardProps) {
  const timeline = order.timeline ?? [];

  if (timeline.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-4">
      <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
        <History size={18} className="text-ap-accent" />
        <span>Order Timeline & Activity</span>
      </h2>

      <div className="relative border-l border-ap-border/80 pl-4 space-y-4 ml-2">
        {timeline.map((event) => {
          const isAdmin = event.actorType === "admin";
          const isCustomer = event.actorType === "customer";

          return (
            <div key={event.id} className="relative group">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-ap-surface bg-ap-accent" />

              <div>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-ap-foreground">
                    {event.title}
                  </p>
                  <span className="text-[10px] text-ap-muted flex items-center gap-1">
                    <Clock size={10} />
                    {formatTimelineDate(event.createdAt)}
                  </span>
                </div>

                {event.note && (
                  <p className="text-xs text-ap-muted mt-1 whitespace-pre-wrap">
                    {event.note}
                  </p>
                )}

                <div className="mt-1 flex items-center gap-1 text-[10px] text-ap-muted">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 text-ap-accent font-medium">
                      <ShieldCheck size={11} /> Admin Action
                    </span>
                  ) : isCustomer ? (
                    <span className="inline-flex items-center gap-1 text-ap-muted">
                      <User size={11} /> Customer Action
                    </span>
                  ) : (
                    <span className="text-ap-muted">System / Guest</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
