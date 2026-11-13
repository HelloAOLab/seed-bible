package org.seedbible.app;

import android.os.Bundle;
import android.os.SystemClock;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * How long res/drawable/splash_icon_animated.xml plays. Android closes the
     * splash screen as soon as the app draws its first frame, which is often
     * before the intro has finished, so it's held open at least this long.
     */
    private static final long SPLASH_ANIMATION_MS = 1000;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        long shownAt = SystemClock.uptimeMillis();
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(
            () -> SystemClock.uptimeMillis() - shownAt < SPLASH_ANIMATION_MS
        );
        super.onCreate(savedInstanceState);
    }
}
