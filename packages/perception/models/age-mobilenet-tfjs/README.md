# Age MobileNet TF.js Model

Place the converted UTKFace MobileNet TF.js model files here:
- `model.json`
- `group1-shard1of1.bin`

If not present, `AgeEstimator` falls back to a mock that returns `28 ± 3`.

## Converting from Keras

```bash
pip install tensorflowjs
tensorflowjs_converter --input_format=keras age_model.h5 ./age-mobilenet-tfjs/
```
