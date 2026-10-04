import { Screen } from '../components/Screen';

export function NotFoundScreen() {
  return (
    <Screen testId="not-found" backTo="/">
      <div className="card center empty">
        <div className="big" aria-hidden>🧭</div>
        <p className="title" lang="ar">حَاوِلْ مَرَّةً أُخْرَى</p>
      </div>
    </Screen>
  );
}
