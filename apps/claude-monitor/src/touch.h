#pragma once
#include <Arduino.h>

// Inisialisasi HSPI + XPT2046
void touchInit();

// Returns true jika ada tap baru (debounced)
bool touchTapped();

// Returns -1 (prev), +1 (next), 0 (no tap), 3 (header = pause toggle)
int touchZone();
