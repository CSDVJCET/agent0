import { TodaySchedule } from "@/components/today-schedule";

export default function MeetPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("/Dashboard.png")' }}
    >
      <TodaySchedule />
    </div>
  );
}
