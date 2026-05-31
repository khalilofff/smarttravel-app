import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { formatCurrency, formatDateRange } from "@/lib/utils";

export default async function PublicTripSharePage({ params }: { params: { id: string } }) {
  const trip = await prisma.trip.findFirst({
    where: { id: params.id, isPublic: true },
    include: {
      user: { select: { name: true } },
      destinations: { orderBy: { orderIndex: "asc" } },
      budgetCategories: true,
      bookings: { orderBy: { createdAt: "desc" } },
      itinerary: {
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: { items: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });
  if (!trip) notFound();
  const destination = trip.destinations[0];

  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="secondary">Public SmartTravel Plan</Badge>
            <h1 className="mt-3 text-3xl font-bold">{trip.title}</h1>
            <p className="mt-2 text-muted-foreground">
              {destination ? `${destination.name}, ${destination.country}` : "No destination saved"} • {formatDateRange(trip.startDate, trip.endDate)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Shared by {trip.user?.name || "SmartTravel user"}</p>
          </div>
          <Link href="/login"><Button>Open SmartTravel</Button></Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Budget</p><p className="text-xl font-semibold">{formatCurrency(trip.totalBudget, trip.currency)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Travelers</p><p className="text-xl font-semibold">{trip.travelerCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Style</p><p className="text-xl font-semibold">{trip.travelStyle}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-xl font-semibold">Itinerary</h2>
            {trip.itinerary?.days?.length ? trip.itinerary.days.map((day: any) => (
              <div key={day.id} className="rounded-xl border p-4">
                <h3 className="font-semibold">Day {day.dayNumber}: {day.title || "Plan"}</h3>
                <div className="mt-3 space-y-2">
                  {day.items.length ? day.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between gap-4 text-sm">
                      <span>{item.startTime || item.timeSlot} — {item.title}</span>
                      <span className="text-muted-foreground">{formatCurrency(item.estimatedCost || 0, item.currency || trip.currency)}</span>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No items saved for this day.</p>}
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No itinerary is saved yet.</p>}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card><CardContent className="p-5"><h2 className="text-lg font-semibold mb-3">Budget</h2>{trip.budgetCategories.length ? trip.budgetCategories.map((c: any) => <div key={c.id} className="flex justify-between text-sm py-1"><span>{c.category}</span><span>{formatCurrency(c.planned, trip.currency)}</span></div>) : <p className="text-sm text-muted-foreground">No budget categories saved.</p>}</CardContent></Card>
          <Card><CardContent className="p-5"><h2 className="text-lg font-semibold mb-3">Bookings</h2>{trip.bookings.length ? trip.bookings.map((b: any) => <div key={b.id} className="flex justify-between text-sm py-1"><span>{b.type} — {b.provider}</span><span>{b.amount ? formatCurrency(b.amount, b.currency) : b.status}</span></div>) : <p className="text-sm text-muted-foreground">No bookings saved.</p>}</CardContent></Card>
        </div>
      </div>
    </main>
  );
}
