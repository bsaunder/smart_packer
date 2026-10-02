import { getCurrentUser } from "@/lib/session";
import { listBags } from "@/services/bagService";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";
import { BagsTable } from "./bags-table";
import { NewBagForm } from "./new-bag-form";

export default async function BagsPage() {
  const user = await getCurrentUser();
  const bags = await listBags(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Bags</h1>
        <p className="text-sm text-muted-foreground">
          The bags you pack into, shared by every trip. Give an item a default bag and it lands in that bag
          whenever it&rsquo;s added to a trip.
        </p>
      </div>

      <NewBagForm />

      <BagsTable bags={bags} />
    </div>
  );
}
