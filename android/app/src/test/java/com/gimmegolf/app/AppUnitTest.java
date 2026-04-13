package com.gimmegolf.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class AppUnitTest {

    @Test
    public void buildConfigKeepsExpectedReleaseIdentity() {
        assertEquals("com.gimmegolf.app", BuildConfig.APPLICATION_ID);
        assertTrue(BuildConfig.VERSION_NAME != null && !BuildConfig.VERSION_NAME.trim().isEmpty());
    }
}
