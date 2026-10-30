package com.aestheticmax.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Native Screen Insets Adapter: Fits within system windows so web content never collides with status bar or camera notch
        WindowCompat.setDecorFitsSystemWindows(window, true);

        // Solid dark theme background for system bars matching app background
        window.setStatusBarColor(Color.parseColor("#07090e"));
        window.setNavigationBarColor(Color.parseColor("#07090e"));

        // Use light icons (white clock, battery, wifi) on dark status bar
        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
            insetsController.setAppearanceLightNavigationBars(false);
        }
    }
}
