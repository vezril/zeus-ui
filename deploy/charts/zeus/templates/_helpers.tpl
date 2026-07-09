{{- define "zeus.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "zeus.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "zeus.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "zeus.labels" -}}
app.kubernetes.io/name: {{ include "zeus.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{- define "zeus.selectorLabels" -}}
app.kubernetes.io/name: {{ include "zeus.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
