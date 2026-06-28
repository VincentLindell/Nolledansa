import Link from "next/link";
import { Music, TrendingUp } from "lucide-react";
import { Dance } from "@/lib/types";
import { sectionLabelWithOrganization, getSectionTheme } from "@/lib/utils";

interface DanceCardProps {
  dance: Dance;
  showTrending?: boolean;
}

export default function DanceCard({ dance, showTrending = false }: DanceCardProps) {
  const theme = getSectionTheme(dance.section);

  return (
    <Link href={`/dance/${dance.id}`} className="group block">
      <div
        className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
        style={{ borderColor: theme.border }}
      >
        {/* Thumbnail / placeholder */}
        <div
          className="relative aspect-video flex items-center justify-center"
          style={{ backgroundColor: theme.tint }}
        >
          {dance.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dance.thumbnail_url}
              alt={dance.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-12 h-12" style={{ color: theme.accent }} />
          )}
          {showTrending && dance.view_count !== undefined && (
            <span
              className="absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: theme.accent, color: theme.onAccent }}
            >
              <TrendingUp className="w-3 h-3" />
              {dance.view_count}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="space-y-2">
            <p
              className="text-2xl sm:text-3xl font-extrabold tracking-tight transition-colors leading-none"
              style={{ color: theme.labelColor }}
            >
              {sectionLabelWithOrganization(dance.section, dance.year, dance.organization)}
            </p>
            <p className="font-semibold text-gray-900 line-clamp-1">
              {dance.title}
            </p>
            <p className="text-sm text-gray-500 line-clamp-1">
              {dance.dancer_names}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
