import { currentUser } from "@/lib/auth";
import { allowedDog, discover, publicDogFields } from "@/features/dogs/service";
import { db } from "@/lib/prisma";
import { PetApp } from "@/features/dogs/pet-app";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await currentUser();
  const [discovery, myDogs] = await Promise.all([
    discover(new URLSearchParams(), user?.id),
    user
      ? db.dog.findMany({
          where: { ownerId: user.id },
          select: publicDogFields,
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const likes = myDogs[0]
    ? await db.like.findMany({
        where: {
          fromId: myDogs[0].id,
          from: allowedDog,
          to: { ...allowedDog, reports: { none: { reporterId: user!.id } } },
        },
        select: { to: { select: publicDogFields } },
      })
    : [];
  return (
    <PetApp
      initialDiscovery={discovery}
      initialUser={user}
      initialMyDogs={myDogs}
      initialLikedDogs={likes.map((like) => like.to)}
    />
  );
}
