"use client";

import Link from "next/link";
import { Card, CardContent, Button } from "@/components/ui";
import { Compass, Plane } from "lucide-react";

export default function MapRemovedPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 animate-fade-in">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Compass className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Map View Removed</h1>
          <p className="text-muted-foreground">
            The standalone map page was removed from the local demo to keep the user experience cleaner.
            Trip planning continues through Explore, AI Planner, My Trips, Bookings, and Budget.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/destinations"><Button variant="outline" className="gap-2"><Compass className="h-4 w-4" />Explore</Button></Link>
            <Link href="/trips"><Button className="gap-2"><Plane className="h-4 w-4" />My Trips</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
