<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Quotation PDF renderer
    |--------------------------------------------------------------------------
    |
    | dompdf    — Pure PHP (works on Hostinger shared hosting)
    | playwright — Node + Chromium (local dev; needs .playwright-browsers)
    | auto      — Use playwright when node + browsers exist, else dompdf
    |
    */
    'driver' => env('QUOTATION_PDF_DRIVER', 'auto'),
];
